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

import { compareResults, verifyExtraction } from '../../src/pipeline/verification';
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
