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
} from '../app/lib/pricing-utils';

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

  it('returns undefined for undefined', () => {
    expect(convertToVND(undefined)).toBeUndefined();
  });

  it('returns 89250 for 3.5', () => {
    expect(convertToVND(3.5)).toBe(89250);
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
});
