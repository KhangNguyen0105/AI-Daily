import { NextResponse } from 'next/server';
import { db } from '../../../db/index';
import { extractions, sources, canonicalModels } from '../../../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { computeFreshnessStatus, getFreshnessBadge, isExcludedFromRankings } from '../../../lib/freshness-tracker';
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
  last_verified_at: string; // ISO timestamp
  status: string;           // 'fresh' / 'recent' / 'aging' / 'stale'
  badge_color: string;      // 'green' / 'blue' / 'amber' / 'red'
  data_age_hours: number;
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
          // Exclude quarantined
          // Note: confidenceLabel could be null for old records
        )
      )
      .orderBy(desc(extractions.updatedAt));

    // Transform to API response format
    const responseRows: PricingRowResponse[] = rows
      .filter((row) => {
        // Exclude quarantined entries
        if (row.confidenceLabel === 'Quarantined') return false;
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
          overall: row.overallConfidence ?? row.sourceConfidence ?? 0,
          label: row.confidenceLabel || mapLegacyConfidence(row.confidence),
          breakdown: {
            source: row.sourceConfidence ?? 0,
            extraction: row.extractionConfidence ?? 0,
            normalization: 0, // normalizationConfidence is an enum, not numeric
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
            last_verified_at: row.lastVerifiedAt?.toISOString() || new Date().toISOString(),
            status: freshnessStatus,
            badge_color: badge.badge_color,
            data_age_hours: dataAgeHours,
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
