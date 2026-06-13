import { describe, it, expect } from 'vitest';
import { getAllAdapters, getAdapter } from '../../src/providers/registry';

const EXPECTED_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'cohere',
  'groq',
  'together',
  'perplexity',
  'xai',
  'fireworks',
  'deepseek',
  'bedrock',
];

describe('Provider Registry - All Adapters', () => {
  it('getAllAdapters() returns exactly 12 adapters', () => {
    const adapters = getAllAdapters();
    expect(adapters).toHaveLength(12);
  });

  it('each expected provider name is in the registry', () => {
    for (const name of EXPECTED_PROVIDERS) {
      const adapter = getAdapter(name);
      expect(adapter, `Adapter '${name}' should be registered`).toBeDefined();
    }
  });

  it('getAdapter() returns correct adapter for each name', () => {
    for (const name of EXPECTED_PROVIDERS) {
      const adapter = getAdapter(name);
      expect(adapter).toBeDefined();
      expect(adapter!.config.name).toBe(name);
    }
  });

  it('each adapter has extract and normalize methods', () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      expect(typeof adapter.extract, `${adapter.config.name} should have extract method`).toBe('function');
      expect(typeof adapter.normalize, `${adapter.config.name} should have normalize method`).toBe('function');
    }
  });

  it("each adapter's config has name, baseUrl, pricingUrl", () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      expect(adapter.config.name, `${adapter.config.name} config.name`).toBeTruthy();
      expect(adapter.config.baseUrl, `${adapter.config.name} config.baseUrl`).toBeTruthy();
      expect(adapter.config.pricingUrl, `${adapter.config.name} config.pricingUrl`).toBeTruthy();
    }
  });
});
