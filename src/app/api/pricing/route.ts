import { NextResponse } from 'next/server';
import { db } from '../../../db/index';
import { extractions, sources } from '../../../db/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { getFreshnessBadge, isExcludedFromRankings } from '../../../lib/freshness-tracker';
import type { FreshnessStatus } from '../../../lib/freshness-tracker';

/**
 * Pricing API Route (GET /api/pricing)
 *
 * Returns pricing data with multi-dimensional confidence breakdown
 * for the frontend comparison table and tooltip display.
 *
 * Phase 2.1-03: Includes full confidence dimensions, per-field confidence,
 * freshness status with badge colors, and human review status.
 */

export interface ConfidenceBreakdown {
  overall: number;       // 0-100
  label: string;         // 'Verified' / 'High' / 'Medium' / 'Low' / 'Quarantined'
  breakdown: {
    source: number;
    extraction: number;
    normalization: number;
    verification: number;
    freshness: number;
  };
  breakdown_summary: string; // "Source: High, Extraction: High, Freshness: Low"
  per_field: {
    model_name?: number;
    input_price?: number;
    output_price?: number;
    context_window?: number;
    currency?: number;
    pricing_unit?: number;
    free_tier?: number;
    source_url?: number;
  };
}

export interface FreshnessInfo {
  last_verified_at: string | null; // ISO timestamp
  status: string;           // 'fresh' / 'recent' / 'aging' / 'stale'
  badge_color: string;      // 'green' / 'blue' / 'amber' / 'red'
  data_age_hours: number | null;
}

export interface PricingRowResponse {
  id: number;
  modelName: string;
  provider: string;
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: number | null;
  confidence: ConfidenceBreakdown;
  freshness: FreshnessInfo;
  sourceUrl: string | null;
  humanReviewStatus: string;
  edgeCases: Record<string, unknown> | null;
}

export async function GET() {
  try {
    // Fetch latest extractions with source and canonical model info
    // Only include non-quarantined, non-excluded extractions
    const rows = await db
      .select({
        id: extractions.id,
        modelName: extractions.modelName,
        inputPricePer1m: extractions.inputPricePer1m,
        outputPricePer1m: extractions.outputPricePer1m,
        contextWindow: extractions.contextWindow,
        // Multi-dimensional confidence (D-07)
        sourceConfidence: extractions.sourceConfidence,
        extractionConfidence: extractions.extractionConfidence,
        normalizationConfidence: extractions.normalizationConfidence,
        freshnessConfidence: extractions.freshnessConfidence,
        verificationConfidence: extractions.verificationConfidence,
        overallConfidence: extractions.overallConfidence,
        confidenceLabel: extractions.confidenceLabel,
        confidenceBreakdown: extractions.confidenceBreakdown,
        perFieldConfidence: extractions.perFieldConfidence,
        // Legacy confidence
        confidence: extractions.confidence,
        // Freshness (D-03)
        lastVerifiedAt: extractions.lastVerifiedAt,
        freshnessStatus: extractions.freshnessStatus,
        dataAgeMinutes: extractions.dataAgeMinutes,
        // Updated at for fallback freshness
        updatedAt: extractions.updatedAt,
        // Verification
        verificationStatus: extractions.verificationStatus,
        // Human review (D-07)
        humanReviewStatus: extractions.humanReviewStatus,
        // Edge cases (D-08)
        edgeCaseFlags: extractions.edgeCaseFlags,
        // Source URL
        sourceUrl: extractions.sourceUrl,
        // Source info
        sourceName: sources.name,
      })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .where(
        and(
          // WR-05: Exclude quarantined items at DB level instead of in-memory filter
          ne(extractions.confidenceLabel, 'Quarantined'),
        )
      )
      .orderBy(desc(extractions.updatedAt));

    // Transform to API response format
    const responseRows: PricingRowResponse[] = rows
      .filter((row) => {
        // IN-08: Quarantined items already excluded at DB level (WR-05 fix)
        // Exclude entries older than 30 days from rankings
        if (row.dataAgeMinutes !== null && isExcludedFromRankings(row.dataAgeMinutes)) return false;
        return true;
      })
      .map((row) => {
        // Compute freshness info
        const freshnessStatus = (row.freshnessStatus as FreshnessStatus) || 'stale';
        const badge = getFreshnessBadge(freshnessStatus);
        const dataAgeHours = row.dataAgeMinutes !== null
          ? Math.round(row.dataAgeMinutes / 60 * 10) / 10
          : 0;

        // Build confidence breakdown
        const confidence: ConfidenceBreakdown = {
          overall: row.overallConfidence ?? row.sourceConfidence ?? mapLegacyConfidenceToScore(row.confidence),
          label: row.confidenceLabel || mapLegacyConfidence(row.confidence),
          breakdown: {
            source: row.sourceConfidence ?? 0,
            extraction: row.extractionConfidence ?? 0,
            normalization: mapNormalizationConfidence(row.normalizationConfidence),
            verification: row.verificationConfidence ?? 0,
            freshness: row.freshnessConfidence ?? 0,
          },
          breakdown_summary: row.confidenceBreakdown || '',
          per_field: (row.perFieldConfidence as ConfidenceBreakdown['per_field']) || {},
        };

        return {
          id: row.id,
          modelName: row.modelName,
          provider: row.sourceName || 'unknown',
          inputPrice: row.inputPricePer1m,
          outputPrice: row.outputPricePer1m,
          contextWindow: row.contextWindow,
          confidence,
          freshness: {
            last_verified_at: row.lastVerifiedAt?.toISOString() || row.updatedAt?.toISOString() || null,
            status: row.lastVerifiedAt ? freshnessStatus : 'unknown',
            badge_color: row.lastVerifiedAt ? badge.badge_color : 'gray',
            data_age_hours: row.lastVerifiedAt ? dataAgeHours : null,
          },
          sourceUrl: row.sourceUrl,
          humanReviewStatus: row.humanReviewStatus || 'unreviewed',
          edgeCases: (row.edgeCaseFlags as Record<string, unknown>) || null,
        };
      });

    return NextResponse.json({
      rows: responseRows,
      total: responseRows.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data', rows: [], total: 0 },
      { status: 500 }
    );
  }
}

/**
 * Map legacy confidence enum to display label.
 */
function mapLegacyConfidence(confidence: string | null): string {
  switch (confidence) {
    case 'verified':
      return 'High';
    case 'likely':
      return 'Medium';
    case 'low_confidence':
      return 'Low';
    default:
      return 'Low';
  }
}

/**
 * WR-06: Map normalization confidence enum to numeric score.
 */
function mapNormalizationConfidence(level: string | null): number {
  switch (level) {
    case 'high': return 88;
    case 'medium': return 72;
    case 'low': return 45;
    case 'unknown': return 15;
    default: return 0;
  }
}

/**
 * IN-05: Map legacy confidence enum to numeric score for fallback.
 */
function mapLegacyConfidenceToScore(confidence: string | null): number {
  switch (confidence) {
    case 'verified': return 88;
    case 'likely': return 72;
    case 'low_confidence': return 35;
    default: return 0;
  }
}
