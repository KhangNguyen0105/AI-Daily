import type { ExtractionResult } from '../providers/base';
import type { SourceTier } from '../providers/types';

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
 * Calculate confidence level based on source tier, data completeness, and
 * verification status.
 *
 * Rules (from research key decision 2):
 * - 'verified': tier1 AND all fields AND verification passed
 * - 'likely': (tier1 AND core fields) OR (tier2 AND all fields AND verification passed)
 * - 'low_confidence': everything else (tier3, missing core fields, failed verification)
 */
export function calculateConfidence(
  tier: SourceTier,
  extraction: ExtractionResult,
  verificationPassed: boolean,
): 'verified' | 'likely' | 'low_confidence' {
  // tier1 + all fields + verification passed -> verified
  if (tier === 'tier1' && hasAllFields(extraction) && verificationPassed) {
    return 'verified';
  }

  // tier1 + core fields (even without verification) -> likely
  if (tier === 'tier1' && hasCoreFields(extraction)) {
    return 'likely';
  }

  // tier2 + all fields + verification passed -> likely
  if (tier === 'tier2' && hasAllFields(extraction) && verificationPassed) {
    return 'likely';
  }

  // Everything else -> low_confidence
  return 'low_confidence';
}
