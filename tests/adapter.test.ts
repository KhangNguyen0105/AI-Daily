import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProviderAdapter,
  ProviderConfig,
  CrawlResult,
  ExtractionResult,
  ProviderExtraction,
} from '../src/providers/base';
import {
  registerAdapter,
  getAdapter,
  getAllAdapters,
} from '../src/providers/registry';

// Concrete test adapter to verify the abstract contract
class TestAdapter extends ProviderAdapter {
  config: ProviderConfig = {
    name: 'test-provider',
    baseUrl: 'https://test.example.com',
    pricingUrl: 'https://test.example.com/pricing',
  };

  async extract(_html: string): Promise<ProviderExtraction> {
    return {
      models: [
        {
          modelName: 'test-model',
          inputPricePer1m: 5.0,
          outputPricePer1m: 15.0,
          contextWindow: 128000,
          confidence: 'likely',
          rawEvidence: '{}',
        },
      ],
      promotions: [],
    };
  }

  normalize(extractions: ProviderExtraction): ProviderExtraction {
    return {
      models: extractions.models.map((e) => ({ ...e, confidence: 'likely' as const })),
      promotions: extractions.promotions,
    };
  }
}

describe('ProviderAdapter base class', () => {
  it('cannot be instantiated directly (abstract class)', () => {
    // TypeScript prevents this at compile time, but we verify
    // the class exists and has the expected shape
    expect(ProviderAdapter).toBeDefined();
    expect(typeof ProviderAdapter).toBe('function');
  });

  it('has abstract extract method', () => {
    const adapter = new TestAdapter();
    expect(typeof adapter.extract).toBe('function');
  });

  it('has abstract normalize method', () => {
    const adapter = new TestAdapter();
    expect(typeof adapter.normalize).toBe('function');
  });

  it('has concrete crawl method', () => {
    const adapter = new TestAdapter();
    expect(typeof adapter.crawl).toBe('function');
  });

  it('config requires name, baseUrl, pricingUrl', () => {
    const adapter = new TestAdapter();
    expect(adapter.config).toHaveProperty('name');
    expect(adapter.config).toHaveProperty('baseUrl');
    expect(adapter.config).toHaveProperty('pricingUrl');
  });

  it('ExtractionResult confidence type is verified | likely | low_confidence', async () => {
    const adapter = new TestAdapter();
    const results = await adapter.extract('<html></html>');
    expect(results.models[0].confidence).toBe('likely');
    const validConfidences = ['verified', 'likely', 'low_confidence'];
    expect(validConfidences).toContain(results.models[0].confidence);
  });

  it('extract returns ProviderExtraction with models array', async () => {
    const adapter = new TestAdapter();
    const results = await adapter.extract('<html></html>');
    expect(results).toHaveProperty('models');
    expect(results).toHaveProperty('promotions');
    expect(Array.isArray(results.models)).toBe(true);
    expect(results.models.length).toBeGreaterThan(0);
    expect(results.models[0]).toHaveProperty('modelName');
    expect(results.models[0]).toHaveProperty('inputPricePer1m');
    expect(results.models[0]).toHaveProperty('outputPricePer1m');
    expect(results.models[0]).toHaveProperty('contextWindow');
    expect(results.models[0]).toHaveProperty('confidence');
    expect(results.models[0]).toHaveProperty('rawEvidence');
  });

  it('normalize returns ProviderExtraction with same model count', () => {
    const adapter = new TestAdapter();
    const input: ProviderExtraction = {
      models: [
        {
          modelName: 'test',
          inputPricePer1m: 1,
          outputPricePer1m: 2,
          contextWindow: 1000,
          confidence: 'low_confidence',
          rawEvidence: '{}',
        },
      ],
      promotions: [],
    };
    const result = adapter.normalize(input);
    expect(result.models).toHaveLength(1);
    expect(result.models[0].confidence).toBe('likely');
  });
});

describe('Adapter registry', () => {
  // Note: Registry is a module-level singleton. Tests that register adapters
  // will affect the global state. This is acceptable for testing the contract.

  it('getAdapter returns undefined for unknown names', () => {
    const result = getAdapter('nonexistent-provider');
    expect(result).toBeUndefined();
  });

  it('registerAdapter stores adapter by config.name', () => {
    const adapter = new TestAdapter();
    registerAdapter(adapter);
    const retrieved = getAdapter('test-provider');
    expect(retrieved).toBe(adapter);
  });

  it('getAllAdapters returns all registered adapters', () => {
    // test-provider is already registered from previous test
    const all = getAllAdapters();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((a) => a.config.name === 'test-provider')).toBe(true);
  });

  it('getAdapter returns the registered adapter instance', () => {
    const adapter = getAdapter('test-provider');
    expect(adapter).toBeDefined();
    expect(adapter!.config.name).toBe('test-provider');
    expect(adapter!.config.pricingUrl).toBe('https://test.example.com/pricing');
  });
});
