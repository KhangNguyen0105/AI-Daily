import { describe, it, expect } from 'vitest';
import {
  hasAllFields,
  hasCoreFields,
  calculateConfidence,
} from '../../src/pipeline/confidence';
import type { ExtractionResult } from '../../src/providers/base';

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

describe('hasAllFields', () => {
  it('returns true when all 4 fields present', () => {
    expect(hasAllFields(allFieldsExtraction)).toBe(true);
  });

  it('returns false when contextWindow is null', () => {
    expect(hasAllFields(coreFieldsOnlyExtraction)).toBe(false);
  });

  it('returns false when inputPricePer1m is null', () => {
    const e: ExtractionResult = {
      ...allFieldsExtraction,
      inputPricePer1m: null,
    };
    expect(hasAllFields(e)).toBe(false);
  });

  it('returns false when outputPricePer1m is null', () => {
    const e: ExtractionResult = {
      ...allFieldsExtraction,
      outputPricePer1m: null,
    };
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

  it('returns true when all fields present (contextWindow is not required)', () => {
    expect(hasCoreFields(allFieldsExtraction)).toBe(true);
  });

  it('returns false when outputPricePer1m is null', () => {
    const e: ExtractionResult = {
      ...allFieldsExtraction,
      outputPricePer1m: null,
    };
    expect(hasCoreFields(e)).toBe(false);
  });

  it('returns false when inputPricePer1m is null', () => {
    const e: ExtractionResult = {
      ...allFieldsExtraction,
      inputPricePer1m: null,
    };
    expect(hasCoreFields(e)).toBe(false);
  });

  it('returns false when modelName is empty', () => {
    expect(hasCoreFields(missingModelNameExtraction)).toBe(false);
  });
});

describe('calculateConfidence', () => {
  it('tier1 + allFields + verified -> verified', () => {
    expect(calculateConfidence('tier1', allFieldsExtraction, true)).toBe(
      'verified',
    );
  });

  it('tier1 + allFields + NOT verified -> likely', () => {
    expect(calculateConfidence('tier1', allFieldsExtraction, false)).toBe(
      'likely',
    );
  });

  it('tier1 + coreFieldsOnly + verified -> likely', () => {
    expect(calculateConfidence('tier1', coreFieldsOnlyExtraction, true)).toBe(
      'likely',
    );
  });

  it('tier2 + allFields + verified -> likely', () => {
    expect(calculateConfidence('tier2', allFieldsExtraction, true)).toBe(
      'likely',
    );
  });

  it('tier2 + allFields + NOT verified -> low_confidence', () => {
    expect(calculateConfidence('tier2', allFieldsExtraction, false)).toBe(
      'low_confidence',
    );
  });

  it('tier3 + allFields + verified -> low_confidence', () => {
    expect(calculateConfidence('tier3', allFieldsExtraction, true)).toBe(
      'low_confidence',
    );
  });

  it('tier1 + missingCoreFields + verified -> low_confidence', () => {
    expect(calculateConfidence('tier1', missingCoreFieldsExtraction, true)).toBe(
      'low_confidence',
    );
  });

  it('tier2 + coreFieldsOnly + verified -> low_confidence', () => {
    expect(calculateConfidence('tier2', coreFieldsOnlyExtraction, true)).toBe(
      'low_confidence',
    );
  });

  it('tier3 + coreFieldsOnly + NOT verified -> low_confidence', () => {
    expect(calculateConfidence('tier3', coreFieldsOnlyExtraction, false)).toBe(
      'low_confidence',
    );
  });
});
