import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractionResult } from '../../src/providers/base';
import type { VerificationModelResult } from '../../src/pipeline/verification';

// Mock the ai module before importing verification
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('../../src/lib/ai-client', () => ({
  getAIModel: vi.fn(() => 'mock-model'),
}));

import { compareResults, verifyExtraction, compareNumericValues, detectLargeChange, verifyWithEvidenceQuotes } from '../../src/pipeline/verification';
import { generateObject } from 'ai';

// --- Fixtures ---

const pass1AllFields: ExtractionResult[] = [
  {
    modelName: 'gpt-4o',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10.0,
    contextWindow: 128000,
    confidence: 'verified',
    rawEvidence: '{}',
  },
];

const pass2Matching: VerificationModelResult[] = [
  {
    modelName: 'gpt-4o',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10.0,
    contextWindow: 128000,
    supported: true,
    evidenceQuote: 'GPT-4o costs $2.50 per 1M input tokens',
  },
];

const pass2Mismatch: VerificationModelResult[] = [
  {
    modelName: 'gpt-4o',
    inputPricePer1m: 3.0, // different from 2.5
    outputPricePer1m: 10.0,
    contextWindow: 128000,
    supported: true,
    evidenceQuote: 'GPT-4o costs $3.00 per 1M input tokens',
  },
];

// --- compareResults tests ---

describe('compareResults', () => {
  it('returns empty array when pass1 and pass2 match exactly', () => {
    const result = compareResults(pass1AllFields, pass2Matching);
    expect(result).toEqual([]);
  });

  it('returns disagreement when inputPricePer1m differs by >0.1%', () => {
    const result = compareResults(pass1AllFields, pass2Mismatch);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('inputPricePer1m');
    expect(result[0].pass1Value).toBe(2.5);
    expect(result[0].pass2Value).toBe(3.0);
  });

  it('returns disagreement when outputPricePer1m differs by >0.1%', () => {
    const pass2: VerificationModelResult[] = [
      {
        ...pass2Matching[0],
        outputPricePer1m: 12.0, // 20% off from 10.0
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('outputPricePer1m');
  });

  it('returns disagreement when contextWindow differs by >0.1%', () => {
    const pass2: VerificationModelResult[] = [
      {
        ...pass2Matching[0],
        contextWindow: 200000, // 56% off from 128000
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('contextWindow');
  });

  it('returns disagreement when pass2 marks supported=false', () => {
    const pass2: VerificationModelResult[] = [
      {
        ...pass2Matching[0],
        supported: false,
        evidenceQuote: 'Could not find pricing',
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((d) => d.pass2Supported === false)).toBe(true);
  });

  it('returns disagreement when model in pass1 not found in pass2', () => {
    const pass2: VerificationModelResult[] = [
      {
        modelName: 'gpt-4-turbo', // different model name
        inputPricePer1m: 2.5,
        outputPricePer1m: 10.0,
        contextWindow: 128000,
        supported: true,
        evidenceQuote: 'quote',
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result).toHaveLength(3); // all 3 fields disagree
    expect(result[0].pass2Supported).toBe(false);
  });

  it('case-insensitive model name matching (gpt-4o matches GPT-4o)', () => {
    const pass2: VerificationModelResult[] = [
      {
        modelName: 'GPT-4o', // different case
        inputPricePer1m: 2.5,
        outputPricePer1m: 10.0,
        contextWindow: 128000,
        supported: true,
        evidenceQuote: 'GPT-4o pricing',
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result).toEqual([]);
  });

  it('small differences within 0.1% tolerance are NOT disagreements', () => {
    const pass2: VerificationModelResult[] = [
      {
        modelName: 'gpt-4o',
        inputPricePer1m: 2.502, // 0.08% off from 2.5
        outputPricePer1m: 10.005, // 0.05% off from 10.0
        contextWindow: 128100, // 0.078% off from 128000
        supported: true,
        evidenceQuote: 'approximately $2.50',
      },
    ];
    const result = compareResults(pass1AllFields, pass2);
    expect(result).toEqual([]);
  });

  it('multiple models with multiple disagreements', () => {
    const pass1: ExtractionResult[] = [
      {
        modelName: 'gpt-4o',
        inputPricePer1m: 2.5,
        outputPricePer1m: 10.0,
        contextWindow: 128000,
        confidence: 'verified',
        rawEvidence: '{}',
      },
      {
        modelName: 'claude-3-opus',
        inputPricePer1m: 15.0,
        outputPricePer1m: 75.0,
        contextWindow: 200000,
        confidence: 'verified',
        rawEvidence: '{}',
      },
    ];
    const pass2: VerificationModelResult[] = [
      {
        modelName: 'gpt-4o',
        inputPricePer1m: 2.5,
        outputPricePer1m: 10.0,
        contextWindow: 128000,
        supported: true,
        evidenceQuote: 'ok',
      },
      {
        modelName: 'claude-3-opus',
        inputPricePer1m: 20.0, // 33% off
        outputPricePer1m: 75.0,
        contextWindow: 200000,
        supported: true,
        evidenceQuote: 'different price',
      },
    ];
    const result = compareResults(pass1, pass2);
    expect(result).toHaveLength(1);
    expect(result[0].modelName).toBe('claude-3-opus');
    expect(result[0].field).toBe('inputPricePer1m');
  });

  it('skips comparison when pass1 value is null', () => {
    const pass1: ExtractionResult[] = [
      {
        modelName: 'gpt-4o',
        inputPricePer1m: 2.5,
        outputPricePer1m: null, // null
        contextWindow: null, // null
        confidence: 'likely',
        rawEvidence: '{}',
      },
    ];
    const pass2: VerificationModelResult[] = [
      {
        modelName: 'gpt-4o',
        inputPricePer1m: 2.5,
        outputPricePer1m: 10.0, // arbitrary
        contextWindow: 128000, // arbitrary
        supported: true,
        evidenceQuote: 'ok',
      },
    ];
    const result = compareResults(pass1, pass2);
    // Only inputPricePer1m is non-null and matches, so no disagreements
    expect(result).toEqual([]);
  });
});

// --- verifyExtraction tests ---

describe('verifyExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns verified=true when pass2 matches pass1', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: { models: pass2Matching },
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      warnings: undefined,
      request: {},
      response: {},
    } as any);

    const result = await verifyExtraction(
      '<html>pricing page</html>',
      pass1AllFields,
    );
    expect(result.verified).toBe(true);
    expect(result.disagreements).toEqual([]);
    expect(result.pass2Results).toEqual(pass2Matching);
  });

  it('returns verified=false when pass2 disagrees', async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: { models: pass2Mismatch },
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      warnings: undefined,
      request: {},
      response: {},
    } as any);

    const result = await verifyExtraction(
      '<html>pricing page</html>',
      pass1AllFields,
    );
    expect(result.verified).toBe(false);
    expect(result.disagreements.length).toBeGreaterThan(0);
  });

  it('throws on LLM API error', async () => {
    vi.mocked(generateObject).mockRejectedValue(new Error('API rate limit'));

    await expect(
      verifyExtraction('<html>pricing</html>', pass1AllFields),
    ).rejects.toThrow('API rate limit');
  });
});

// --- compareNumericValues tests ---

describe('compareNumericValues', () => {
  it('matches within same-unit tolerance (0.1%)', () => {
    const result = compareNumericValues(2.5, 2.502, 'same');
    expect(result.matches).toBe(true);
    expect(result.percentDiff).toBeLessThan(0.001);
  });

  it('rejects beyond same-unit tolerance', () => {
    const result = compareNumericValues(2.5, 3.0, 'same');
    expect(result.matches).toBe(false);
    expect(result.percentDiff).toBeGreaterThan(0.001);
  });

  it('matches within converted-unit tolerance (0.5%)', () => {
    const result = compareNumericValues(3.0, 3.01, 'converted');
    expect(result.matches).toBe(true);
  });

  it('rejects beyond converted-unit tolerance', () => {
    const result = compareNumericValues(3.0, 3.2, 'converted');
    expect(result.matches).toBe(false);
  });

  it('handles zero values', () => {
    const result = compareNumericValues(0, 0, 'same');
    expect(result.matches).toBe(true);
    expect(result.percentDiff).toBe(0);
  });

  it('handles custom tolerance', () => {
    const result = compareNumericValues(100, 105, 'same', 0.06);
    expect(result.matches).toBe(true); // 5% diff, 6% tolerance
  });
});

// --- detectLargeChange tests ---

describe('detectLargeChange', () => {
  const baseExtraction: ExtractionResult = {
    modelName: 'gpt-4o',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10.0,
    contextWindow: 128000,
    confidence: 'verified',
    rawEvidence: '{}',
  };

  it('returns not changed when no previous extraction', () => {
    const result = detectLargeChange(baseExtraction, null);
    expect(result.changed).toBe(false);
    expect(result.percentChange).toBe(0);
  });

  it('detects large price increase (>20%)', () => {
    const newExtraction = { ...baseExtraction, inputPricePer1m: 3.5 }; // 40% increase
    const result = detectLargeChange(newExtraction, baseExtraction);
    expect(result.changed).toBe(true);
    expect(result.changeType).toBe('price_increase');
    expect(result.percentChange).toBeGreaterThan(0.2);
  });

  it('detects large price decrease (>20%)', () => {
    const newExtraction = { ...baseExtraction, inputPricePer1m: 1.5 }; // 40% decrease
    const result = detectLargeChange(newExtraction, baseExtraction);
    expect(result.changed).toBe(true);
    expect(result.changeType).toBe('price_decrease');
    expect(result.percentChange).toBeGreaterThan(0.2);
  });

  it('does not flag small price changes (<20%)', () => {
    const newExtraction = { ...baseExtraction, inputPricePer1m: 2.7 }; // 8% increase
    const result = detectLargeChange(newExtraction, baseExtraction);
    expect(result.changed).toBe(false);
  });

  it('detects field disappearance', () => {
    const newExtraction = { ...baseExtraction, outputPricePer1m: null };
    const result = detectLargeChange(newExtraction, baseExtraction);
    expect(result.changed).toBe(true);
    expect(result.changeType).toBe('field_disappear');
  });

  it('detects unit change via output price change', () => {
    // Simulate a huge change that might indicate unit change
    const newExtraction = { ...baseExtraction, outputPricePer1m: 100.0 }; // 10x increase
    const result = detectLargeChange(newExtraction, baseExtraction);
    expect(result.changed).toBe(true);
    expect(result.changeType).toBe('price_increase');
    expect(result.percentChange).toBeGreaterThan(0.2);
  });
});

// --- verifyWithEvidenceQuotes tests ---

describe('verifyWithEvidenceQuotes', () => {
  const html = '<html><p>GPT-4o costs $2.50 per 1M input tokens</p></html>';

  it('returns verified when all evidence quotes match', async () => {
    const extraction: ExtractionResult = {
      modelName: 'GPT-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      confidence: 'verified',
      rawEvidence: '{}',
    };
    const evidenceQuotes = {
      model_name: { source_url: 'url', extracted_text_snippet: 'GPT-4o', evidence_quote: 'GPT-4o', evidence_hash: 'abc', extracted_at: new Date() },
      input_price: { source_url: 'url', extracted_text_snippet: '$2.50', evidence_quote: '$2.50', evidence_hash: 'abc', extracted_at: new Date() },
      output_price: { source_url: 'url', extracted_text_snippet: '$10.00', evidence_quote: '$10.00', evidence_hash: 'abc', extracted_at: new Date() },
    };
    const result = await verifyWithEvidenceQuotes(extraction, evidenceQuotes, html);
    expect(result.verified).toBe(true);
    expect(result.missingEvidence).toHaveLength(0);
    expect(result.quoteMismatches).toHaveLength(0);
  });

  it('reports missing evidence for core fields', async () => {
    const extraction: ExtractionResult = {
      modelName: 'GPT-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      confidence: 'verified',
      rawEvidence: '{}',
    };
    const evidenceQuotes = {}; // no evidence at all
    const result = await verifyWithEvidenceQuotes(extraction, evidenceQuotes, html);
    expect(result.verified).toBe(false);
    expect(result.missingEvidence).toContain('model_name');
    expect(result.missingEvidence).toContain('input_price');
    expect(result.missingEvidence).toContain('output_price');
  });

  it('reports quote mismatches when value does not match quote', async () => {
    const extraction: ExtractionResult = {
      modelName: 'GPT-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      confidence: 'verified',
      rawEvidence: '{}',
    };
    const evidenceQuotes = {
      model_name: { source_url: 'url', extracted_text_snippet: 'GPT-4o', evidence_quote: 'GPT-4o', evidence_hash: 'abc', extracted_at: new Date() },
      input_price: { source_url: 'url', extracted_text_snippet: '$15.00', evidence_quote: '$15.00', evidence_hash: 'abc', extracted_at: new Date() }, // mismatch
      output_price: { source_url: 'url', extracted_text_snippet: '$10.00', evidence_quote: '$10.00', evidence_hash: 'abc', extracted_at: new Date() },
    };
    const result = await verifyWithEvidenceQuotes(extraction, evidenceQuotes, html);
    expect(result.verified).toBe(false);
    expect(result.quoteMismatches).toContain('input_price');
  });
});
