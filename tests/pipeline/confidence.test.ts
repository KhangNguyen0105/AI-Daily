import { describe, it, expect } from 'vitest';
import {
  hasAllFields,
  hasCoreFields,
  calculateConfidence,
  mapConfidenceLabel,
  buildBreakdownSummary,
  calculateSourceConfidence,
  calculateExtractionConfidence,
  calculateNormalizationConfidence,
  calculateVerificationConfidence,
  calculatePerFieldConfidence,
  calculateOverallConfidence,
  applyFreshnessConfidence,
  applyHumanOverride,
  calculateMultiDimensionalConfidence,
} from '../../src/pipeline/confidence';
import type { ExtractionResult } from '../../src/providers/base';
import type { ConfidenceScore } from '../../src/pipeline/confidence';

// Fixtures
const allFieldsExtraction: ExtractionResult = {
  modelName: 'gpt-4o',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: 128000,
  confidence: 'verified',
  rawEvidence: '{}',
};

const coreFieldsOnlyExtraction: ExtractionResult = {
  modelName: 'gpt-4o',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: null,
  confidence: 'likely',
  rawEvidence: '{}',
};

const missingCoreFieldsExtraction: ExtractionResult = {
  modelName: 'gpt-4o',
  inputPricePer1m: null,
  outputPricePer1m: null,
  contextWindow: null,
  confidence: 'low_confidence',
  rawEvidence: '{}',
};

const missingModelNameExtraction: ExtractionResult = {
  modelName: '',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: 128000,
  confidence: 'low_confidence',
  rawEvidence: '{}',
};

// Legacy tests (backward compatibility)
describe('hasAllFields', () => {
  it('returns true when all 4 fields present', () => {
    expect(hasAllFields(allFieldsExtraction)).toBe(true);
  });

  it('returns false when contextWindow is null', () => {
    expect(hasAllFields(coreFieldsOnlyExtraction)).toBe(false);
  });

  it('returns false when inputPricePer1m is null', () => {
    const e: ExtractionResult = { ...allFieldsExtraction, inputPricePer1m: null };
    expect(hasAllFields(e)).toBe(false);
  });

  it('returns false when outputPricePer1m is null', () => {
    const e: ExtractionResult = { ...allFieldsExtraction, outputPricePer1m: null };
    expect(hasAllFields(e)).toBe(false);
  });

  it('returns false when modelName is empty', () => {
    expect(hasAllFields(missingModelNameExtraction)).toBe(false);
  });
});

describe('hasCoreFields', () => {
  it('returns true when modelName, inputPrice, outputPrice present', () => {
    expect(hasCoreFields(coreFieldsOnlyExtraction)).toBe(true);
  });

  it('returns true when all fields present', () => {
    expect(hasCoreFields(allFieldsExtraction)).toBe(true);
  });

  it('returns false when outputPricePer1m is null', () => {
    const e: ExtractionResult = { ...allFieldsExtraction, outputPricePer1m: null };
    expect(hasCoreFields(e)).toBe(false);
  });

  it('returns false when inputPricePer1m is null', () => {
    const e: ExtractionResult = { ...allFieldsExtraction, inputPricePer1m: null };
    expect(hasCoreFields(e)).toBe(false);
  });

  it('returns false when modelName is empty', () => {
    expect(hasCoreFields(missingModelNameExtraction)).toBe(false);
  });
});

describe('calculateConfidence (legacy)', () => {
  it('tier1 + allFields + verified -> verified', () => {
    expect(calculateConfidence('tier1', allFieldsExtraction, true)).toBe('verified');
  });

  it('tier1 + allFields + NOT verified -> likely', () => {
    expect(calculateConfidence('tier1', allFieldsExtraction, false)).toBe('likely');
  });

  it('tier1 + coreFieldsOnly + verified -> likely', () => {
    expect(calculateConfidence('tier1', coreFieldsOnlyExtraction, true)).toBe('likely');
  });

  it('tier2 + allFields + verified -> likely', () => {
    expect(calculateConfidence('tier2', allFieldsExtraction, true)).toBe('likely');
  });

  it('tier2 + allFields + NOT verified -> low_confidence', () => {
    expect(calculateConfidence('tier2', allFieldsExtraction, false)).toBe('low_confidence');
  });

  it('tier3 + allFields + verified -> low_confidence', () => {
    expect(calculateConfidence('tier3', allFieldsExtraction, true)).toBe('low_confidence');
  });

  it('tier1 + missingCoreFields + verified -> low_confidence', () => {
    expect(calculateConfidence('tier1', missingCoreFieldsExtraction, true)).toBe('low_confidence');
  });

  it('tier2 + coreFieldsOnly + verified -> low_confidence', () => {
    expect(calculateConfidence('tier2', coreFieldsOnlyExtraction, true)).toBe('low_confidence');
  });

  it('tier3 + coreFieldsOnly + NOT verified -> low_confidence', () => {
    expect(calculateConfidence('tier3', coreFieldsOnlyExtraction, false)).toBe('low_confidence');
  });
});

// --- Multi-dimensional confidence tests ---

describe('mapConfidenceLabel', () => {
  it('returns Verified for score >= 90', () => {
    expect(mapConfidenceLabel(90)).toBe('Verified');
    expect(mapConfidenceLabel(95)).toBe('Verified');
    expect(mapConfidenceLabel(100)).toBe('Verified');
  });

  it('returns High for score 75-89', () => {
    expect(mapConfidenceLabel(75)).toBe('High');
    expect(mapConfidenceLabel(85)).toBe('High');
    expect(mapConfidenceLabel(89)).toBe('High');
  });

  it('returns Medium for score 55-74', () => {
    expect(mapConfidenceLabel(55)).toBe('Medium');
    expect(mapConfidenceLabel(65)).toBe('Medium');
    expect(mapConfidenceLabel(74)).toBe('Medium');
  });

  it('returns Low for score 30-54', () => {
    expect(mapConfidenceLabel(30)).toBe('Low');
    expect(mapConfidenceLabel(45)).toBe('Low');
    expect(mapConfidenceLabel(54)).toBe('Low');
  });

  it('returns Quarantined for score < 30', () => {
    expect(mapConfidenceLabel(0)).toBe('Quarantined');
    expect(mapConfidenceLabel(15)).toBe('Quarantined');
    expect(mapConfidenceLabel(29)).toBe('Quarantined');
  });

  it('returns Quarantined when quarantined flag is true regardless of score', () => {
    expect(mapConfidenceLabel(95, true)).toBe('Quarantined');
  });
});

describe('calculateSourceConfidence', () => {
  it('tier1 pricing page -> 88', () => {
    expect(calculateSourceConfidence('tier1')).toBe(88);
  });

  it('tier2 blog/changelog -> 75', () => {
    expect(calculateSourceConfidence('tier2')).toBe(75);
  });

  it('tier3 aggregators -> 58', () => {
    expect(calculateSourceConfidence('tier3')).toBe(58);
  });

  it('unofficial source caps at 65', () => {
    expect(calculateSourceConfidence('tier1', false)).toBe(65);
  });

  it('tier3 unofficial -> min(58, 65) = 58', () => {
    expect(calculateSourceConfidence('tier3', false)).toBe(58);
  });
});

describe('calculateExtractionConfidence', () => {
  it('hasAllFields -> 88', () => {
    expect(calculateExtractionConfidence(allFieldsExtraction)).toBe(88);
  });

  it('hasCoreFields only -> 72', () => {
    expect(calculateExtractionConfidence(coreFieldsOnlyExtraction)).toBe(72);
  });

  it('has model name but no prices -> 55', () => {
    expect(calculateExtractionConfidence(missingCoreFieldsExtraction)).toBe(55);
  });

  it('missing everything -> 25', () => {
    expect(calculateExtractionConfidence(missingModelNameExtraction)).toBe(25);
  });
});

describe('calculateNormalizationConfidence', () => {
  it('high (direct per-1M) -> 88', () => {
    expect(calculateNormalizationConfidence('high')).toBe(88);
  });

  it('medium (per-1K converted) -> 72', () => {
    expect(calculateNormalizationConfidence('medium')).toBe(72);
  });

  it('low (non-token plan) -> 45', () => {
    expect(calculateNormalizationConfidence('low')).toBe(45);
  });

  it('unknown (contact sales) -> 15', () => {
    expect(calculateNormalizationConfidence('unknown')).toBe(15);
  });

  it('undefined -> 60 (default)', () => {
    expect(calculateNormalizationConfidence(undefined)).toBe(60);
  });
});

describe('calculateVerificationConfidence', () => {
  it('no verification result -> 55', () => {
    expect(calculateVerificationConfidence(null)).toBe(55);
  });

  it('verified with no edge cases -> 88', () => {
    const result = { verified: true, disagreements: [], pass2Results: [] };
    expect(calculateVerificationConfidence(result)).toBe(88);
  });

  it('verified with edge cases -> 72', () => {
    const result = { verified: true, disagreements: [], pass2Results: [] };
    const flags = { free_tier: { detected: true, text: 'Free tier available' } };
    expect(calculateVerificationConfidence(result, flags)).toBe(72);
  });

  it('disagreement detected -> 25', () => {
    const result = {
      verified: false,
      disagreements: [{ modelName: 'gpt-4o', field: 'inputPricePer1m' as const, pass1Value: 2.5, pass2Value: 5.0, pass2Supported: true }],
      pass2Results: [],
    };
    expect(calculateVerificationConfidence(result)).toBe(25);
  });
});

describe('calculateOverallConfidence', () => {
  it('computes weighted sum correctly', () => {
    // 88*0.25 + 88*0.25 + 88*0.20 + 88*0.20 + 90*0.10 = 22+22+17.6+17.6+9 = 88.2 -> 88
    const result = calculateOverallConfidence({
      source: 88,
      extraction: 88,
      normalization: 88,
      verification: 88,
      freshness: 90,
    });
    expect(result).toBe(88);
  });

  it('low freshness pulls down overall', () => {
    const highResult = calculateOverallConfidence({
      source: 88,
      extraction: 88,
      normalization: 88,
      verification: 88,
      freshness: 90,
    });
    const lowResult = calculateOverallConfidence({
      source: 88,
      extraction: 88,
      normalization: 88,
      verification: 88,
      freshness: 20,
    });
    expect(lowResult).toBeLessThan(highResult);
  });
});

describe('applyFreshnessConfidence', () => {
  it('high freshness does not penalize much', () => {
    const result = applyFreshnessConfidence(90, 90);
    expect(result).toBe(90);
  });

  it('low freshness penalizes score', () => {
    const result = applyFreshnessConfidence(90, 20);
    // 90*0.9 + 20*0.1 = 81+2 = 83
    expect(result).toBe(83);
    expect(result).toBeLessThan(90);
  });

  it('never exceeds base score', () => {
    const result = applyFreshnessConfidence(50, 100);
    expect(result).toBeLessThanOrEqual(50);
  });
});

describe('calculatePerFieldConfidence', () => {
  it('all fields present and verified -> 90', () => {
    const result = calculatePerFieldConfidence(allFieldsExtraction, {
      verified: true,
      disagreements: [],
      pass2Results: [],
    });
    expect(result.model_name).toBe(90);
    expect(result.input_price).toBe(90);
    expect(result.output_price).toBe(90);
    expect(result.context_window).toBe(90);
  });

  it('missing fields -> 15', () => {
    const result = calculatePerFieldConfidence(missingCoreFieldsExtraction, null);
    expect(result.input_price).toBe(15);
    expect(result.output_price).toBe(15);
    expect(result.context_window).toBe(15);
  });

  it('not verified -> 60 for present fields', () => {
    const result = calculatePerFieldConfidence(allFieldsExtraction, null);
    expect(result.model_name).toBe(60);
    expect(result.input_price).toBe(60);
  });
});

describe('calculateMultiDimensionalConfidence', () => {
  it('tier1 all fields verified -> high confidence', async () => {
    const result = await calculateMultiDimensionalConfidence(
      'tier1',
      allFieldsExtraction,
      { verified: true, disagreements: [], pass2Results: [] },
      90, // freshness
      undefined,
      'high',
    );
    expect(result.source_confidence).toBe(88);
    expect(result.extraction_confidence).toBe(88);
    expect(result.normalization_confidence).toBe(88);
    expect(result.verification_confidence).toBe(88);
    expect(result.freshness_confidence).toBe(90);
    // 88*0.25 + 88*0.25 + 88*0.20 + 88*0.20 + 90*0.10 = 88
    expect(result.overall_confidence).toBe(88);
    expect(result.label).toBe('High');
  });

  it('tier3 low confidence -> quarantined', async () => {
    const result = await calculateMultiDimensionalConfidence(
      'tier3',
      missingCoreFieldsExtraction,
      {
        verified: false,
        disagreements: [{
          modelName: 'gpt-4o',
          field: 'inputPricePer1m',
          pass1Value: null,
          pass2Value: 5.0,
          pass2Supported: true,
        }],
        pass2Results: [],
      },
      20, // stale freshness
      undefined,
      'unknown',
    );
    expect(result.label).toBe('Quarantined');
    expect(result.overall_confidence).toBeLessThan(30);
  });

  it('low price confidence caps overall at Medium (54)', async () => {
    const extraction: ExtractionResult = {
      modelName: 'gpt-4o',
      inputPricePer1m: null, // missing = low confidence
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      confidence: 'low_confidence',
      rawEvidence: '{}',
    };
    const result = await calculateMultiDimensionalConfidence(
      'tier1',
      extraction,
      { verified: true, disagreements: [], pass2Results: [] },
      90,
      undefined,
      'high',
    );
    expect(result.overall_confidence).toBeLessThanOrEqual(54);
  });

  it('unofficial source caps overall at High (74)', async () => {
    const result = await calculateMultiDimensionalConfidence(
      'tier1',
      allFieldsExtraction,
      { verified: true, disagreements: [], pass2Results: [] },
      90,
      undefined,
      'high',
      false, // unofficial source
    );
    expect(result.overall_confidence).toBeLessThanOrEqual(74);
  });

  it('edge case detected adds warning note', async () => {
    const flags = { free_tier: { detected: true, text: 'Free tier' } };
    const result = await calculateMultiDimensionalConfidence(
      'tier1',
      allFieldsExtraction,
      { verified: true, disagreements: [], pass2Results: [] },
      90,
      flags,
      'high',
    );
    expect(result.breakdown_summary).toContain('verified_with_warning');
  });

  it('breakdown summary includes all dimensions', async () => {
    const result = await calculateMultiDimensionalConfidence(
      'tier1',
      allFieldsExtraction,
      { verified: true, disagreements: [], pass2Results: [] },
      90,
      undefined,
      'high',
    );
    expect(result.breakdown_summary).toContain('Source:');
    expect(result.breakdown_summary).toContain('Extraction:');
    expect(result.breakdown_summary).toContain('Normalization:');
    expect(result.breakdown_summary).toContain('Freshness:');
    expect(result.breakdown_summary).toContain('Verification:');
  });
});

describe('applyHumanOverride', () => {
  const machineScore: ConfidenceScore = {
    source_confidence: 88,
    extraction_confidence: 88,
    normalization_confidence: 88,
    freshness_confidence: 90,
    verification_confidence: 88,
    overall_confidence: 88,
    per_field_confidence: {},
    label: 'High',
    breakdown_summary: 'Source: High, Extraction: High, Normalization: High, Freshness: Verified, Verification: High',
  };

  it('replaces overall_confidence with override', () => {
    const result = applyHumanOverride(machineScore, {
      confidence_override: 95,
      reviewed_by: 'admin',
      reviewed_at: new Date(),
      review_notes: 'Manually verified',
      human_review_status: 'approved',
    });
    expect(result.overall_confidence).toBe(95);
    expect(result.label).toBe('Verified');
  });

  it('preserves machine scores in breakdown', () => {
    const result = applyHumanOverride(machineScore, {
      confidence_override: 95,
      reviewed_by: 'admin',
      reviewed_at: new Date(),
      review_notes: 'Manually verified',
      human_review_status: 'approved',
    });
    expect(result.source_confidence).toBe(88);
    expect(result.extraction_confidence).toBe(88);
    expect(result.breakdown_summary).toContain('Human override: 95');
  });

  it('human override can downgrade score', () => {
    const result = applyHumanOverride(machineScore, {
      confidence_override: 30,
      reviewed_by: 'admin',
      reviewed_at: new Date(),
      review_notes: 'Incorrect data',
      human_review_status: 'rejected',
    });
    expect(result.overall_confidence).toBe(30);
    expect(result.label).toBe('Low');
  });
});
