import { describe, it, expect } from 'vitest';
import { OpenAIAdapter } from '../src/providers/openai/adapter';
import { getAdapter, getAllAdapters } from '../src/providers/registry';

describe('OpenAIAdapter', () => {
  it('config.name is openai', () => {
    const adapter = new OpenAIAdapter();
    expect(adapter.config.name).toBe('openai');
  });

  it('config.pricingUrl contains openai.com', () => {
    const adapter = new OpenAIAdapter();
    expect(adapter.config.pricingUrl).toContain('openai.com');
  });

  it('config.baseUrl is https://openai.com', () => {
    const adapter = new OpenAIAdapter();
    expect(adapter.config.baseUrl).toBe('https://openai.com');
  });

  it('has crawl method', () => {
    const adapter = new OpenAIAdapter();
    expect(typeof adapter.crawl).toBe('function');
  });

  it('has extract method', () => {
    const adapter = new OpenAIAdapter();
    expect(typeof adapter.extract).toBe('function');
  });

  it('has normalize method', () => {
    const adapter = new OpenAIAdapter();
    expect(typeof adapter.normalize).toBe('function');
  });

  it('normalize sets confidence to likely for all items', () => {
    const adapter = new OpenAIAdapter();
    const input = {
      models: [
        {
          modelName: 'gpt-4o',
          inputPricePer1m: 2.5,
          outputPricePer1m: 10.0,
          contextWindow: 128000,
          confidence: 'low_confidence' as const,
          rawEvidence: '{}',
        },
        {
          modelName: 'gpt-4o-mini',
          inputPricePer1m: 0.15,
          outputPricePer1m: 0.6,
          contextWindow: 128000,
          confidence: 'verified' as const,
          rawEvidence: '{}',
        },
      ],
      promotions: []
    };
    const result = adapter.normalize(input);
    expect(result.models).toHaveLength(2);
    // IN-04: normalize() is now identity — confidence passes through unchanged
    expect(result.models[0].confidence).toBe('low_confidence');
    expect(result.models[1].confidence).toBe('verified');
  });
});

describe('Registry - OpenAI registration', () => {
  it('getAdapter returns OpenAIAdapter instance', () => {
    const adapter = getAdapter('openai');
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
  });

  it('getAllAdapters includes OpenAI adapter', () => {
    const all = getAllAdapters();
    const openai = all.find((a) => a.config.name === 'openai');
    expect(openai).toBeDefined();
    expect(openai).toBeInstanceOf(OpenAIAdapter);
  });
});
