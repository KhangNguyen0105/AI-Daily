import type { SourceTier } from '../providers/types';
import { db } from '../db/index';
import { sources } from '../db/schema';
import { eq } from 'drizzle-orm';
import { collectQueue } from '../pipeline/queues';

/**
 * Freshness tracking and SLA enforcement (D-03).
 *
 * Tracks data age and enforces tiered freshness SLAs:
 *   Tier 1 (OpenAI, Anthropic, Google, etc.): Stale >24h
 *   Tier 2 (Cohere, Perplexity, Groq, etc.): Stale >48h
 *   Tier 3+ (all others): Stale >7d
 *
 * >14d shows warning, >30d excluded from rankings.
 */

// --- Types ---

export type FreshnessStatus = 'fresh' | 'recent' | 'aging' | 'stale';

export interface FreshnessMetadata {
  last_verified_at: Date;
  freshness_status: FreshnessStatus;
  data_age_minutes: number;
  sla_breach: boolean;
  sla_days_overdue: number; // >0 if breached
}

export interface SLAThreshold {
  tier: SourceTier;
  crawl_frequency_hours: number;
  freshness_sla_hours: number;    // when data becomes stale
  warning_threshold_hours: number; // when >14d warning shows
  exclusion_threshold_hours: number; // when >30d excluded from rankings
}

export interface SLABreachResult {
  breached: boolean;
  daysOverdue: number;
  requiresRecrawl: boolean;
}

export interface FreshnessBadge {
  status: FreshnessStatus;
  badge_color: 'green' | 'blue' | 'amber' | 'red';
  display_text: string;
}

// --- SLA tier definitions (per D-03) ---

export const SLA_TIERS: Record<SourceTier, SLAThreshold> = {
  tier1: {
    tier: 'tier1',
    crawl_frequency_hours: 4,   // 2-4 hour target
    freshness_sla_hours: 24,
    warning_threshold_hours: 336,  // 14 days
    exclusion_threshold_hours: 720, // 30 days
  },
  tier2: {
    tier: 'tier2',
    crawl_frequency_hours: 12,  // 6-12 hour target
    freshness_sla_hours: 48,
    warning_threshold_hours: 336,
    exclusion_threshold_hours: 720,
  },
  tier3: {
    tier: 'tier3',
    crawl_frequency_hours: 24,  // daily
    freshness_sla_hours: 168,   // 7 days
    warning_threshold_hours: 336,
    exclusion_threshold_hours: 720,
  },
};

// --- Core functions ---

/**
 * Compute data age in minutes since last verification.
 */
export function computeDataAge(lastVerifiedAt: Date): number {
  const now = Date.now();
  const verified = lastVerifiedAt.getTime();
  return Math.max(0, Math.floor((now - verified) / (1000 * 60)));
}

/**
 * Compute freshness status from data age (tier-agnostic).
 *
 *   <24h: fresh
 *   24-72h: recent
 *   3-7d: aging
 *   >7d: stale
 */
export function computeFreshnessStatus(dataAgeMinutes: number): FreshnessStatus {
  const hours = dataAgeMinutes / 60;
  if (hours < 24) return 'fresh';
  if (hours < 72) return 'recent';
  if (hours < 168) return 'aging'; // 7 days
  return 'stale';
}

/**
 * Compute freshness confidence score from data age (0-100).
 *
 *   <24h: 90
 *   24-72h: 70
 *   3-7d: 40
 *   >7d: 20
 *   >14d: 10
 */
export function computeFreshnessConfidence(dataAgeMinutes: number): number {
  const hours = dataAgeMinutes / 60;
  if (hours < 24) return 90;
  if (hours < 72) return 70;
  if (hours < 168) return 40;
  if (hours < 336) return 20; // 14 days
  return 10;
}

/**
 * Get freshness badge for UI display.
 */
export function getFreshnessBadge(status: FreshnessStatus): FreshnessBadge {
  switch (status) {
    case 'fresh':
      return { status, badge_color: 'green', display_text: 'Fresh' };
    case 'recent':
      return { status, badge_color: 'blue', display_text: 'Recent' };
    case 'aging':
      return { status, badge_color: 'amber', display_text: 'Aging' };
    case 'stale':
      return { status, badge_color: 'red', display_text: 'Stale' };
  }
}

/**
 * Check SLA breach for a source based on its tier.
 *
 * Tier 1: breach if >24h stale
 * Tier 2: breach if >48h stale
 * Tier 3+: breach if >7d (168h) stale
 *
 * @returns breach status, days overdue, and whether priority recrawl is needed
 */
export function checkSLABreach(
  dataAgeMinutes: number,
  sourceTier: SourceTier,
): SLABreachResult {
  const sla = SLA_TIERS[sourceTier];
  const ageHours = dataAgeMinutes / 60;

  if (ageHours > sla.freshness_sla_hours) {
    const overdueHours = ageHours - sla.freshness_sla_hours;
    const daysOverdue = Math.floor(overdueHours / 24);
    return {
      breached: true,
      daysOverdue: Math.max(1, daysOverdue),
      requiresRecrawl: true,
    };
  }

  return { breached: false, daysOverdue: 0, requiresRecrawl: false };
}

/**
 * Compute full freshness metadata for an extraction.
 */
export function computeFreshnessMetadata(
  lastVerifiedAt: Date,
  sourceTier: SourceTier,
): FreshnessMetadata {
  const dataAgeMinutes = computeDataAge(lastVerifiedAt);
  const freshnessStatus = computeFreshnessStatus(dataAgeMinutes);
  const breach = checkSLABreach(dataAgeMinutes, sourceTier);

  return {
    last_verified_at: lastVerifiedAt,
    freshness_status: freshnessStatus,
    data_age_minutes: dataAgeMinutes,
    sla_breach: breach.breached,
    sla_days_overdue: breach.daysOverdue,
  };
}

/**
 * Check if data exceeds warning threshold (>14d).
 */
export function isWarningThreshold(dataAgeMinutes: number): boolean {
  return dataAgeMinutes / 60 > 336; // 14 days
}

/**
 * Check if data exceeds exclusion threshold (>30d).
 * Excluded data should be removed from rankings by default.
 */
export function isExcludedFromRankings(dataAgeMinutes: number): boolean {
  return dataAgeMinutes / 60 > 720; // 30 days
}

/**
 * Mark a source's data as stale (for admin dashboard alerting).
 * This is a stub that logs the stale status — full admin integration in Phase 8.
 */
export async function markStaleData(
  sourceId: number,
  providerName: string,
): Promise<void> {
  // Phase 8 integration: surface in admin dashboard
  console.warn(
    `Freshness: Source ${sourceId} (${providerName}) marked as stale. ` +
    `Admin alert generated.`
  );
}

/**
 * Trigger a priority recrawl for a source.
 * Enqueues a high-priority collect job in BullMQ when SLA breach is detected.
 */
export async function triggerPriorityRecrawl(
  sourceId: number,
  reason: string,
): Promise<void> {
  // Look up provider name from sourceId
  const sourceRows = await db
    .select({ name: sources.name })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (sourceRows.length === 0) {
    console.warn(`triggerPriorityRecrawl: source ${sourceId} not found`);
    return;
  }

  const providerName = sourceRows[0].name;
  console.warn(
    `Freshness: Priority recrawl triggered for ${providerName} (source ${sourceId}). Reason: ${reason}`
  );

  await collectQueue.add(
    'priority-recrawl',
    {
      providerName,
      sourceId,
      isPriorityRecrawl: true,
    },
    {
      jobId: `priority-recrawl-${providerName}-${Date.now()}`,
      priority: 1, // Highest priority
    },
  );
}
