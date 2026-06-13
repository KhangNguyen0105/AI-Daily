import { describe, it, expect } from 'vitest';
import { getProviderLogo, getUniqueProviders, providerLogos } from '../app/lib/provider-metadata';
import type { PricingRow } from '../app/components/PricingTable';

describe('providerLogos', () => {
  it('contains entries for all 12 major providers', () => {
    const expectedProviders = [
      'openai', 'anthropic', 'google', 'mistral', 'cohere',
      'groq', 'together', 'perplexity', 'xai', 'fireworks',
      'deepseek', 'amazon',
    ];
    for (const provider of expectedProviders) {
      expect(providerLogos[provider]).toBeDefined();
      expect(providerLogos[provider]).toMatch(/^\/logos\/.*\.svg$/);
    }
  });

  it('includes common aliases', () => {
    expect(providerLogos['google gemini']).toBe('/logos/google.svg');
    expect(providerLogos['together ai']).toBe('/logos/together.svg');
    expect(providerLogos['perplexity ai']).toBe('/logos/perplexity.svg');
    expect(providerLogos['fireworks ai']).toBe('/logos/fireworks.svg');
    expect(providerLogos['aws']).toBe('/logos/amazon.svg');
    expect(providerLogos['amazon bedrock']).toBe('/logos/amazon.svg');
    expect(providerLogos['mistral ai']).toBe('/logos/mistral.svg');
  });
});

describe('getProviderLogo', () => {
  it('returns logo path for known provider (exact match)', () => {
    expect(getProviderLogo('openai')).toBe('/logos/openai.svg');
    expect(getProviderLogo('anthropic')).toBe('/logos/anthropic.svg');
  });

  it('normalizes case (case-insensitive lookup)', () => {
    expect(getProviderLogo('OpenAI')).toBe('/logos/openai.svg');
    expect(getProviderLogo('ANTHROPIC')).toBe('/logos/anthropic.svg');
    expect(getProviderLogo('Google')).toBe('/logos/google.svg');
  });

  it('trims whitespace', () => {
    expect(getProviderLogo('  openai  ')).toBe('/logos/openai.svg');
    expect(getProviderLogo(' anthropic ')).toBe('/logos/anthropic.svg');
  });

  it('returns null for unknown provider', () => {
    expect(getProviderLogo('unknown-provider')).toBeNull();
    expect(getProviderLogo('')).toBeNull();
  });

  it('resolves aliases correctly', () => {
    expect(getProviderLogo('Google Gemini')).toBe('/logos/google.svg');
    expect(getProviderLogo('Together AI')).toBe('/logos/together.svg');
    expect(getProviderLogo('AWS')).toBe('/logos/amazon.svg');
    expect(getProviderLogo('Amazon Bedrock')).toBe('/logos/amazon.svg');
  });
});

describe('getUniqueProviders', () => {
  const mockData: PricingRow[] = [
    { id: 1, modelName: 'gpt-4o', inputPricePer1m: 2.5, outputPricePer1m: 10, contextWindow: 128000, confidence: 'verified', collectedAt: new Date(), sourceName: 'OpenAI', sourceUrl: null },
    { id: 2, modelName: 'gpt-4o-mini', inputPricePer1m: 0.15, outputPricePer1m: 0.6, contextWindow: 128000, confidence: 'verified', collectedAt: new Date(), sourceName: 'OpenAI', sourceUrl: null },
    { id: 3, modelName: 'claude-3.5-sonnet', inputPricePer1m: 3, outputPricePer1m: 15, contextWindow: 200000, confidence: 'verified', collectedAt: new Date(), sourceName: 'Anthropic', sourceUrl: null },
    { id: 4, modelName: 'gemini-2.0-flash', inputPricePer1m: 0.1, outputPricePer1m: 0.4, contextWindow: 1000000, confidence: 'likely', collectedAt: new Date(), sourceName: 'Google', sourceUrl: null },
  ];

  it('returns sorted unique provider names', () => {
    const result = getUniqueProviders(mockData);
    expect(result).toEqual(['Anthropic', 'Google', 'OpenAI']);
  });

  it('deduplicates providers', () => {
    const result = getUniqueProviders(mockData);
    expect(result).toHaveLength(3);
  });

  it('returns empty array for empty data', () => {
    expect(getUniqueProviders([])).toEqual([]);
  });

  it('skips rows with null sourceName', () => {
    const dataWithNull: PricingRow[] = [
      { id: 1, modelName: 'model-a', inputPricePer1m: null, outputPricePer1m: null, contextWindow: null, confidence: 'likely', collectedAt: new Date(), sourceName: null, sourceUrl: null },
      { id: 2, modelName: 'model-b', inputPricePer1m: 1, outputPricePer1m: 2, contextWindow: 1000, confidence: 'verified', collectedAt: new Date(), sourceName: 'OpenAI', sourceUrl: null },
    ];
    expect(getUniqueProviders(dataWithNull)).toEqual(['OpenAI']);
  });
});
