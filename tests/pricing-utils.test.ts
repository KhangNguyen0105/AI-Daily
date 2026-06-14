import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatContextWindow,
  sanitizeDisplayName,
  getConfidenceColor,
  getModelFamily,
  USD_VND_RATE,
  convertToVND,
  formatVND,
  formatCurrencyPrice,
  calculatePracticalCost,
  calculateScenarioCosts,
} from '../app/lib/pricing-utils';
import type { PricingRow } from '../app/components/PricingTable';

describe('formatPrice', () => {
  it('returns "N/A" for null', () => {
    expect(formatPrice(null)).toBe('N/A');
  });

  it('returns "$0.00" for 0', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('returns "$3.50" for 3.5', () => {
    expect(formatPrice(3.5)).toBe('$3.50');
  });

  it('returns "$0.0025" for very small values (up to 4 decimal places)', () => {
    expect(formatPrice(0.0025)).toBe('$0.0025');
  });

  it('returns "$0.01" for 0.01', () => {
    expect(formatPrice(0.01)).toBe('$0.01');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatPrice(undefined as unknown as null)).toBe('N/A');
  });

  it('formats large values with 2 decimal places', () => {
    expect(formatPrice(15.75)).toBe('$15.75');
  });
});

describe('formatContextWindow', () => {
  it('returns "N/A" for null', () => {
    expect(formatContextWindow(null)).toBe('N/A');
  });

  it('returns "128K" for 128000', () => {
    expect(formatContextWindow(128000)).toBe('128K');
  });

  it('returns "1M" for 1000000', () => {
    expect(formatContextWindow(1000000)).toBe('1M');
  });

  it('returns "2M" for 2000000', () => {
    expect(formatContextWindow(2000000)).toBe('2M');
  });

  it('returns "500" for small values under 1000', () => {
    expect(formatContextWindow(500)).toBe('500');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatContextWindow(undefined as unknown as null)).toBe('N/A');
  });
});

describe('sanitizeDisplayName', () => {
  it('strips bidi override characters (U+202A-U+202E)', () => {
    const malicious = 'GPT‪4o';
    expect(sanitizeDisplayName(malicious)).not.toContain('‪');
  });

  it('strips bidi isolate characters (U+2066-U+2069)', () => {
    const malicious = 'GPT⁦4o';
    expect(sanitizeDisplayName(malicious)).not.toContain('⁦');
  });

  it('truncates at 100 chars with "..."', () => {
    const longName = 'a'.repeat(150);
    const result = sanitizeDisplayName(longName);
    expect(result).toHaveLength(103); // 100 + "..."
    expect(result.endsWith('...')).toBe(true);
  });

  it('does not truncate short names', () => {
    expect(sanitizeDisplayName('GPT-4o')).toBe('GPT-4o');
  });

  it('handles empty string', () => {
    expect(sanitizeDisplayName('')).toBe('');
  });
});

describe('getConfidenceColor', () => {
  it('returns green class for "verified"', () => {
    expect(getConfidenceColor('verified')).toContain('green');
  });

  it('returns yellow class for "likely"', () => {
    expect(getConfidenceColor('likely')).toContain('yellow');
  });

  it('returns red class for "low_confidence"', () => {
    expect(getConfidenceColor('low_confidence')).toContain('red');
  });

  it('returns gray class for unknown values', () => {
    expect(getConfidenceColor('unknown')).toContain('gray');
  });
});

describe('getModelFamily', () => {
  it('returns "GPT-4" for "gpt-4o"', () => {
    expect(getModelFamily('gpt-4o')).toBe('GPT-4');
  });

  it('returns "GPT-4" for "gpt-4o-mini"', () => {
    expect(getModelFamily('gpt-4o-mini')).toBe('GPT-4');
  });

  it('returns "Claude 3" for "claude-3-opus"', () => {
    expect(getModelFamily('claude-3-opus')).toBe('Claude 3');
  });

  it('returns "Claude 3.5" for "claude-3.5-sonnet"', () => {
    expect(getModelFamily('claude-3.5-sonnet')).toBe('Claude 3.5');
  });

  it('returns "Gemini" for "gemini-2.0-flash"', () => {
    expect(getModelFamily('gemini-2.0-flash')).toBe('Gemini');
  });

  it('returns "Gemini" for "gemini-1.5-pro"', () => {
    expect(getModelFamily('gemini-1.5-pro')).toBe('Gemini');
  });

  it('returns "Mistral" for "mistral-large"', () => {
    expect(getModelFamily('mistral-large')).toBe('Mistral');
  });

  it('returns "Llama" for "llama-3.1-70b"', () => {
    expect(getModelFamily('llama-3.1-70b')).toBe('Llama');
  });

  it('returns "Other" for unknown model', () => {
    expect(getModelFamily('unknown-model')).toBe('Other');
  });

  it('returns "GPT-3" for "gpt-3.5-turbo"', () => {
    expect(getModelFamily('gpt-3.5-turbo')).toBe('GPT-3');
  });

  it('returns "Claude 2" for "claude-2.1"', () => {
    expect(getModelFamily('claude-2.1')).toBe('Claude 2');
  });

  it('returns "Cohere" for "command-r-plus"', () => {
    expect(getModelFamily('command-r-plus')).toBe('Cohere');
  });

  it('returns "DeepSeek" for "deepseek-v3"', () => {
    expect(getModelFamily('deepseek-v3')).toBe('DeepSeek');
  });

  it('returns "Qwen" for "qwen-2.5-72b"', () => {
    expect(getModelFamily('qwen-2.5-72b')).toBe('Qwen');
  });

  it('is case-insensitive', () => {
    expect(getModelFamily('GPT-4o')).toBe('GPT-4');
    expect(getModelFamily('Claude-3-opus')).toBe('Claude 3');
  });
});

describe('USD_VND_RATE', () => {
  it('is 25500', () => {
    expect(USD_VND_RATE).toBe(25500);
  });
});

describe('convertToVND', () => {
  it('returns 25500 for 1', () => {
    expect(convertToVND(1)).toBe(25500);
  });

  it('returns 0 for 0', () => {
    expect(convertToVND(0)).toBe(0);
  });

  it('returns null for null', () => {
    expect(convertToVND(null)).toBeNull();
  });

  it('returns null for undefined (collapses to null)', () => {
    expect(convertToVND(undefined)).toBeNull();
  });

  it('returns 89250 for 3.5', () => {
    expect(convertToVND(3.5)).toBe(89250);
  });

  it('uses custom rate when provided', () => {
    expect(convertToVND(1, 26000)).toBe(26000);
  });

  it('uses custom rate for 3.5', () => {
    expect(convertToVND(3.5, 26000)).toBe(91000);
  });

  it('falls back to USD_VND_RATE when rate is undefined', () => {
    expect(convertToVND(1, undefined)).toBe(25500);
  });

  it('returns null for null with custom rate', () => {
    expect(convertToVND(null, 26000)).toBeNull();
  });
});

describe('formatVND', () => {
  it('returns "N/A" for null', () => {
    expect(formatVND(null)).toBe('N/A');
  });

  it('returns "N/A" for undefined', () => {
    expect(formatVND(undefined)).toBe('N/A');
  });

  it('returns "0 ₫" for 0', () => {
    expect(formatVND(0)).toBe('0 ₫');
  });

  it('returns "25.500 ₫" for 25500', () => {
    expect(formatVND(25500)).toBe('25.500 ₫');
  });

  it('returns "89.250 ₫" for 89250', () => {
    expect(formatVND(89250)).toBe('89.250 ₫');
  });

  it('returns "1.000.000 ₫" for 1000000', () => {
    expect(formatVND(1000000)).toBe('1.000.000 ₫');
  });

  it('returns "1.234.567 ₫" for 1234567', () => {
    expect(formatVND(1234567)).toBe('1.234.567 ₫');
  });
});

describe('formatCurrencyPrice', () => {
  it('returns "N/A" for null with usd', () => {
    expect(formatCurrencyPrice(null, 'usd')).toBe('N/A');
  });

  it('returns "N/A" for null with vnd', () => {
    expect(formatCurrencyPrice(null, 'vnd')).toBe('N/A');
  });

  it('returns "$3.50" for 3.5 with usd', () => {
    expect(formatCurrencyPrice(3.5, 'usd')).toBe('$3.50');
  });

  it('returns "89.250 ₫" for 3.5 with vnd', () => {
    expect(formatCurrencyPrice(3.5, 'vnd')).toBe('89.250 ₫');
  });

  it('returns "$0.00" for 0 with usd', () => {
    expect(formatCurrencyPrice(0, 'usd')).toBe('$0.00');
  });

  it('returns "0 ₫" for 0 with vnd', () => {
    expect(formatCurrencyPrice(0, 'vnd')).toBe('0 ₫');
  });

  it('returns "$0.0025" for 0.0025 with usd', () => {
    expect(formatCurrencyPrice(0.0025, 'usd')).toBe('$0.0025');
  });

  it('returns "64 ₫" for 0.0025 with vnd', () => {
    expect(formatCurrencyPrice(0.0025, 'vnd')).toBe('64 ₫');
  });

  it('returns "N/A" for undefined with usd', () => {
    expect(formatCurrencyPrice(undefined, 'usd')).toBe('N/A');
  });

  it('uses custom rate for vnd conversion', () => {
    expect(formatCurrencyPrice(1, 'vnd', 26000)).toBe('26.000 ₫');
  });

  it('uses custom rate for 3.5 vnd', () => {
    expect(formatCurrencyPrice(3.5, 'vnd', 26000)).toBe('91.000 ₫');
  });

  it('ignores rate for usd currency', () => {
    expect(formatCurrencyPrice(3.5, 'usd', 26000)).toBe('$3.50');
  });

  it('falls back to default rate when rate is undefined', () => {
    expect(formatCurrencyPrice(1, 'vnd', undefined)).toBe('25.500 ₫');
  });
});

describe('calculatePracticalCost', () => {
  const validModel: PricingRow = {
    id: 1,
    sourceId: 1,
    modelName: 'gpt-4o',
    inputPricePer1m: 2.5,
    outputPricePer1m: 10.0,
    contextWindow: 128000,
    confidence: 'verified',
    collectedAt: new Date('2026-06-01'),
    sourceName: 'OpenAI',
    sourceUrl: 'https://openai.com',
  };

  it('returns correct cost breakdown for valid pricing', () => {
    const result = calculatePracticalCost(validModel, 10_000, 20_000);
    expect(result).not.toBeNull();
    expect(result!.inputCost).toBe(0.025);   // (10000/1M) * 2.5
    expect(result!.outputCost).toBe(0.2);     // (20000/1M) * 10.0
    expect(result!.totalCost).toBe(0.225);
  });

  it('preserves model metadata in result', () => {
    const result = calculatePracticalCost(validModel, 10_000, 20_000);
    expect(result!.modelId).toBe(1);
    expect(result!.modelName).toBe('gpt-4o');
    expect(result!.sourceName).toBe('OpenAI');
    expect(result!.confidence).toBe('verified');
    expect(result!.inputPricePer1m).toBe(2.5);
    expect(result!.outputPricePer1m).toBe(10.0);
  });

  it('returns null when inputPricePer1m is null', () => {
    const model: PricingRow = { ...validModel, inputPricePer1m: null };
    expect(calculatePracticalCost(model, 10_000, 20_000)).toBeNull();
  });

  it('returns null when outputPricePer1m is null', () => {
    const model: PricingRow = { ...validModel, outputPricePer1m: null };
    expect(calculatePracticalCost(model, 10_000, 20_000)).toBeNull();
  });

  it('returns null when both prices are null', () => {
    const model: PricingRow = { ...validModel, inputPricePer1m: null, outputPricePer1m: null };
    expect(calculatePracticalCost(model, 10_000, 20_000)).toBeNull();
  });

  it('returns zero costs when prices are zero', () => {
    const model: PricingRow = { ...validModel, inputPricePer1m: 0, outputPricePer1m: 0 };
    const result = calculatePracticalCost(model, 10_000, 20_000);
    expect(result).not.toBeNull();
    expect(result!.inputCost).toBe(0);
    expect(result!.outputCost).toBe(0);
    expect(result!.totalCost).toBe(0);
  });

  it('computes exact values for known inputs', () => {
    // $3 per 1M input, $15 per 1M output, 65000 in, 5000 out
    const model: PricingRow = { ...validModel, inputPricePer1m: 3, outputPricePer1m: 15 };
    const result = calculatePracticalCost(model, 65_000, 5_000);
    expect(result!.inputCost).toBeCloseTo(0.195);
    expect(result!.outputCost).toBeCloseTo(0.075);
    expect(result!.totalCost).toBeCloseTo(0.27);
  });
});

describe('calculateScenarioCosts', () => {
  const models: PricingRow[] = [
    {
      id: 1,
      sourceId: 1,
      modelName: 'expensive-model',
      inputPricePer1m: 10,
      outputPricePer1m: 30,
      contextWindow: 128000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Provider A',
      sourceUrl: 'https://a.com',
    },
    {
      id: 2,
      sourceId: 2,
      modelName: 'cheap-model',
      inputPricePer1m: 0.5,
      outputPricePer1m: 1.5,
      contextWindow: 64000,
      confidence: 'likely',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Provider B',
      sourceUrl: 'https://b.com',
    },
    {
      id: 3,
      sourceId: 3,
      modelName: 'mid-model',
      inputPricePer1m: 3,
      outputPricePer1m: 10,
      contextWindow: 200000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Provider C',
      sourceUrl: 'https://c.com',
    },
  ];

  it('sorts results by totalCost ascending (cheapest first)', () => {
    const result = calculateScenarioCosts(models, 10_000, 20_000);
    expect(result).toHaveLength(3);
    expect(result[0].modelName).toBe('cheap-model');
    expect(result[1].modelName).toBe('mid-model');
    expect(result[2].modelName).toBe('expensive-model');
  });

  it('excludes models with null inputPricePer1m', () => {
    const withNull = [...models, {
      id: 4,
      modelName: 'no-input-price',
      inputPricePer1m: null,
      outputPricePer1m: 10,
      contextWindow: 128000,
      confidence: 'verified' as const,
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Provider D',
      sourceUrl: 'https://d.com',
    }];
    const result = calculateScenarioCosts(withNull, 10_000, 20_000);
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.modelName === 'no-input-price')).toBeUndefined();
  });

  it('excludes models with null outputPricePer1m', () => {
    const withNull = [...models, {
      id: 5,
      modelName: 'no-output-price',
      inputPricePer1m: 5,
      outputPricePer1m: null,
      contextWindow: 128000,
      confidence: 'verified' as const,
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Provider E',
      sourceUrl: 'https://e.com',
    }];
    const result = calculateScenarioCosts(withNull, 10_000, 20_000);
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.modelName === 'no-output-price')).toBeUndefined();
  });

  it('returns empty array when all models have null pricing', () => {
    const nullModels: PricingRow[] = [
      {
        id: 1,
        sourceId: 1,
        modelName: 'null-model',
        inputPricePer1m: null,
        outputPricePer1m: null,
        contextWindow: 128000,
        confidence: 'verified',
        collectedAt: new Date('2026-06-01'),
        sourceName: 'Provider',
        sourceUrl: 'https://example.com',
      },
    ];
    const result = calculateScenarioCosts(nullModels, 10_000, 20_000);
    expect(result).toHaveLength(0);
  });

  it('preserves metadata for each model in results', () => {
    const result = calculateScenarioCosts(models, 10_000, 20_000);
    const cheap = result.find((r) => r.modelName === 'cheap-model')!;
    expect(cheap.modelId).toBe(2);
    expect(cheap.sourceName).toBe('Provider B');
    expect(cheap.confidence).toBe('likely');
    expect(cheap.inputPricePer1m).toBe(0.5);
    expect(cheap.outputPricePer1m).toBe(1.5);
  });
});
