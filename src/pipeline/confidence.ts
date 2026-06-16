import type { ExtractionResult } from '../providers/base';
import type { SourceTier } from '../providers/types';
import type { VerificationResult } from './verification';
import type { EdgeCaseFlags } from './edge-case-classifier';

/**
 * Multi-dimensional confidence scoring system (D-07).
 *
 * Confidence uses a 0-100 internal scale displayed as:
 *   Verified (90-100), High (75-89), Medium (55-74), Low (30-54), Quarantined (<30)
 *
 * Six dimensions tracked separately:
 *   source, extraction, normalization, freshness, verification, overall
 * Per-field confidence enables a row to have reliable model name (high)
 * but uncertain context window (low).
 */

// --- Exported types ---

export type ConfidenceLabel = 'Verified' | 'High' | 'Medium' | 'Low' | 'Quarantined';

export interface PerFieldConfidence {
  model_name?: number;
  provider?: number;
  input_price?: number;
  output_price?: number;
  context_window?: number;
  currency?: number;
  pricing_unit?: number;
  free_tier?: number;
  source_url?: number;
}

export interface ConfidenceScore {
  source_confidence: number;        // 0-100, quality of source document
  extraction_confidence: number;    // 0-100, quality of LLM extraction
  normalization_confidence: number; // 0-100, quality of unit/currency conversion
  freshness_confidence: number;     // 0-100, age of data
  verification_confidence: number;  // 0-100, strength of verification check
  overall_confidence: number;       // 0-100, weighted combination

  per_field_confidence: PerFieldConfidence;

  // UI display
  label: ConfidenceLabel;
  breakdown_summary: string; // e.g., "Source: High, Extraction: Medium, Freshness: Low"
}

export interface HumanReviewOverride {
  confidence_override: number; // 0-100, replaces machine score
  reviewed_by: string;         // admin username
  reviewed_at: Date;
  review_notes: string;
  human_review_status: 'approved' | 'corrected' | 'rejected' | 'quarantined';
}

// --- Legacy helpers (kept for backward compatibility) ---

/**
 * Check if an extraction has ALL required fields populated.
 * All fields: modelName, inputPricePer1m, outputPricePer1m, contextWindow.
 */
export function hasAllFields(e: ExtractionResult): boolean {
  return (
    e.modelName.trim().length > 0 &&
    e.inputPricePer1m !== null &&
    e.outputPricePer1m !== null &&
    e.contextWindow !== null
  );
}

/**
 * Check if an extraction has CORE fields populated.
 * Core fields: modelName, inputPricePer1m, outputPricePer1m.
 */
export function hasCoreFields(e: ExtractionResult): boolean {
  return (
    e.modelName.trim().length > 0 &&
    e.inputPricePer1m !== null &&
    e.outputPricePer1m !== null
  );
}

/**
 * Legacy confidence calculation (kept for backward compatibility).
 */
export function calculateConfidence(
  tier: SourceTier,
  extraction: ExtractionResult,
  verificationPassed: boolean,
): 'verified' | 'likely' | 'low_confidence' {
  if (tier === 'tier1' && hasAllFields(extraction) && verificationPassed) {
    return 'verified';
  }
  if (tier === 'tier1' && hasCoreFields(extraction)) {
    return 'likely';
  }
  if (tier === 'tier2' && hasAllFields(extraction) && verificationPassed) {
    return 'likely';
  }
  return 'low_confidence';
}

// --- Label mapping ---

/**
 * Map overall confidence score to display label.
 */
export function mapConfidenceLabel(score: number, quarantined = false): ConfidenceLabel {
  if (quarantined || score < 30) return 'Quarantined';
  if (score >= 90) return 'Verified';
  if (score >= 75) return 'High';
  if (score >= 55) return 'Medium';
  return 'Low'; // 30-54
}

/**
 * Generate a human-readable breakdown summary for tooltip display.
 * e.g., "Source: High, Extraction: Medium, Freshness: Low"
 */
export function buildBreakdownSummary(score: ConfidenceScore): string {
  const labelFor = (v: number) => mapConfidenceLabel(v);
  return [
    `Source: ${labelFor(score.source_confidence)}`,
    `Extraction: ${labelFor(score.extraction_confidence)}`,
    `Normalization: ${labelFor(score.normalization_confidence)}`,
    `Freshness: ${labelFor(score.freshness_confidence)}`,
    `Verification: ${labelFor(score.verification_confidence)}`,
  ].join(', ');
}

// --- Dimension calculators ---

/**
 * Source Confidence (25% weight, per D-07):
 *   Tier 1 (official pricing page): 85-90
 *   Tier 2 (official blog/changelog): 70-80
 *   Tier 3 (aggregators): 50-65
 */
export function calculateSourceConfidence(
  tier: SourceTier,
  isOfficialSource = true,
): number {
  let base: number;
  switch (tier) {
    case 'tier1':
      base = 88; // 85-90 range midpoint
      break;
    case 'tier2':
      base = 75; // 70-80 range midpoint
      break;
    case 'tier3':
      base = 58; // 50-65 range midpoint
      break;
    default:
      base = 50;
  }
  // Unofficial sources get a penalty
  if (!isOfficialSource) {
    base = Math.min(base, 65);
  }
  return base;
}

/**
 * Extraction Confidence (25% weight):
 *   hasAllFields: 85-90
 *   hasCoreFields: 70-75
 *   missingContext: 50-60
 *   missing core field: 20-30
 */
export function calculateExtractionConfidence(extraction: ExtractionResult): number {
  if (hasAllFields(extraction)) return 88;
  if (hasCoreFields(extraction)) return 72;
  // Has model name but no prices
  if (extraction.modelName.trim().length > 0) return 55;
  // Missing almost everything
  return 25;
}

/**
 * Normalization Confidence (20% weight, from D-05):
 *   high (direct per-1M tokens): 85-90
 *   medium (arithmetic conversion from per-1K to per-1M): 70-75
 *   low (non-token plan): 40-50
 *   unknown (contact sales): 10-20
 */
export function calculateNormalizationConfidence(
  level: 'high' | 'medium' | 'low' | 'unknown' | undefined,
): number {
  switch (level) {
    case 'high':
      return 88;
    case 'medium':
      return 72;
    case 'low':
      return 45;
    case 'unknown':
      return 15;
    default:
      return 60; // default when not specified
  }
}

/**
 * Verification Confidence (20% weight):
 *   Pass B matched (0.1% tolerance): 85-90
 *   Pass B matched with warning (edge case): 70-75
 *   Pass B disagreement detected: 20-30
 *   No second pass: 50-60
 */
export function calculateVerificationConfidence(
  verificationResult: VerificationResult | null,
  edgeCaseFlags?: EdgeCaseFlags,
): number {
  if (!verificationResult) return 55; // no second pass

  if (verificationResult.verified) {
    // Check for edge cases that should downgrade
    if (edgeCaseFlags && Object.keys(edgeCaseFlags).length > 0) {
      return 72; // verified with warning
    }
    return 88; // fully verified
  }

  if (verificationResult.disagreements.length > 0) {
    return 25; // disagreement detected
  }

  return 55; // no definitive result
}

/**
 * Apply per-field confidence scores based on extraction completeness
 * and evidence quality.
 */
export function calculatePerFieldConfidence(
  extraction: ExtractionResult,
  verificationResult: VerificationResult | null,
): PerFieldConfidence {
  const fieldPresent = (val: unknown) => val !== null && val !== undefined;
  const verified = verificationResult?.verified ?? false;
  const base = verified ? 90 : 60;

  return {
    model_name: extraction.modelName.trim().length > 0 ? base : 15,
    input_price: fieldPresent(extraction.inputPricePer1m) ? base : 15,
    output_price: fieldPresent(extraction.outputPricePer1m) ? base : 15,
    context_window: fieldPresent(extraction.contextWindow) ? base : 15,
    source_url: 70, // default when source URL is available
  };
}

// --- Core scoring function ---

/**
 * Compute weighted overall confidence from 6 dimensions.
 *
 * Weights (per D-07):
 *   source: 0.25, extraction: 0.25, normalization: 0.20,
 *   verification: 0.20, freshness: 0.10
 */
export function calculateOverallConfidence(dimensions: {
  source: number;
  extraction: number;
  normalization: number;
  verification: number;
  freshness: number;
}): number {
  const weighted =
    dimensions.source * 0.25 +
    dimensions.extraction * 0.25 +
    dimensions.normalization * 0.20 +
    dimensions.verification * 0.20 +
    dimensions.freshness * 0.10;

  return Math.round(weighted);
}

/**
 * Apply critical rules that cap overall confidence:
 * 1. If input_price_confidence < 40 OR output_price_confidence < 40
 *    => overall cannot exceed 54 (Medium max)
 * 2. If source is unofficial => overall cannot exceed 74 (High max)
 * 3. If verification disagreement => quarantined (<30)
 * 4. If edge_case detected => add note "verified_with_warning"
 */
function applyCriticalRules(
  overall: number,
  perField: PerFieldConfidence,
  sourceTier: SourceTier,
  isOfficialSource: boolean,
  verificationResult: VerificationResult | null,
  edgeCaseFlags?: EdgeCaseFlags,
): { score: number; quarantined: boolean; notes: string[] } {
  let score = overall;
  let quarantined = false;
  const notes: string[] = [];

  // Rule 1: Low price confidence caps at Medium (54)
  if (
    (perField.input_price !== undefined && perField.input_price < 40) ||
    (perField.output_price !== undefined && perField.output_price < 40)
  ) {
    score = Math.min(score, 54);
    notes.push('Low price confidence caps overall at Medium');
  }

  // Rule 2: Unofficial source caps at High (74)
  if (!isOfficialSource) {
    score = Math.min(score, 74);
    notes.push('Unofficial source caps overall at High');
  }

  // Rule 3: Verification disagreement => quarantined
  if (verificationResult && !verificationResult.verified && verificationResult.disagreements.length > 0) {
    score = Math.min(score, 29);
    quarantined = true;
    notes.push('Verification disagreement detected');
  }

  // Rule 4: Edge case detected
  if (edgeCaseFlags && Object.keys(edgeCaseFlags).length > 0) {
    notes.push('verified_with_warning');
  }

  return { score, quarantined, notes };
}

/**
 * Apply freshness penalty to a base confidence score.
 */
export function applyFreshnessConfidence(
  baseScore: number,
  freshnessConfidence: number,
): number {
  // Freshness acts as a multiplier: if freshness is low, it pulls down the overall
  // Use a weighted blend: 90% base + 10% freshness influence
  const blended = baseScore * 0.9 + freshnessConfidence * 0.1;
  return Math.round(Math.min(baseScore, blended));
}

/**
 * Main entry point: Calculate multi-dimensional confidence for an extraction.
 *
 * Must be called after:
 * 1. extraction complete (source + extraction + normalization confidence set)
 * 2. verification complete (verification + freshness confidence available)
 * 3. Optional: human override applied
 */
export async function calculateMultiDimensionalConfidence(
  tier: SourceTier,
  extraction: ExtractionResult,
  verificationResult: VerificationResult | null,
  freshnessConfidence: number,
  edgeCaseFlags?: EdgeCaseFlags,
  normalizationConfidence?: 'high' | 'medium' | 'low' | 'unknown',
  isOfficialSource = true,
): Promise<ConfidenceScore> {
  // Calculate each dimension
  const sourceConf = calculateSourceConfidence(tier, isOfficialSource);
  const extractionConf = calculateExtractionConfidence(extraction);
  const normalizationConf = calculateNormalizationConfidence(normalizationConfidence);
  const verificationConf = calculateVerificationConfidence(verificationResult, edgeCaseFlags);
  const freshnessConf = freshnessConfidence;

  // Per-field confidence
  const perField = calculatePerFieldConfidence(extraction, verificationResult);

  // Weighted overall
  let overall = calculateOverallConfidence({
    source: sourceConf,
    extraction: extractionConf,
    normalization: normalizationConf,
    verification: verificationConf,
    freshness: freshnessConf,
  });

  // Apply critical rules
  const rules = applyCriticalRules(
    overall,
    perField,
    tier,
    isOfficialSource,
    verificationResult,
    edgeCaseFlags,
  );
  overall = rules.score;

  // Build result
  const score: ConfidenceScore = {
    source_confidence: sourceConf,
    extraction_confidence: extractionConf,
    normalization_confidence: normalizationConf,
    freshness_confidence: freshnessConf,
    verification_confidence: verificationConf,
    overall_confidence: overall,
    per_field_confidence: perField,
    label: mapConfidenceLabel(overall, rules.quarantined),
    breakdown_summary: '', // filled below
  };

  // Build breakdown with dimension labels + any critical rule notes
  let summary = buildBreakdownSummary(score);
  if (rules.notes.length > 0) {
    summary += ` [${rules.notes.join('; ')}]`;
  }
  score.breakdown_summary = summary;

  return score;
}

/**
 * Apply human override to a machine-generated confidence score.
 * Per D-07: Manual review sits on top, does not erase machine scores.
 */
export function applyHumanOverride(
  machineScore: ConfidenceScore,
  humanOverride: HumanReviewOverride,
): ConfidenceScore {
  // Override replaces overall_confidence in UI
  // Keep machine scores in DB for audit trail
  return {
    ...machineScore,
    overall_confidence: humanOverride.confidence_override,
    label: mapConfidenceLabel(humanOverride.confidence_override),
    breakdown_summary: `${machineScore.breakdown_summary} [Human override: ${humanOverride.confidence_override}]`,
  };
}
