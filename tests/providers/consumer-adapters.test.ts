import { describe, it, expect } from 'vitest';

describe('Consumer Adapter Registry', () => {
  it('should export registerConsumerAdapter', async () => {
    const mod = await import('../../src/providers/consumer/registry');
    expect(mod.registerConsumerAdapter).toBeDefined();
    expect(typeof mod.registerConsumerAdapter).toBe('function');
  });

  it('should export getAllConsumerAdapters', async () => {
    const mod = await import('../../src/providers/consumer/registry');
    expect(mod.getAllConsumerAdapters).toBeDefined();
    expect(typeof mod.getAllConsumerAdapters).toBe('function');
  });

  it('should export CONSUMER_TIER1_PROVIDERS with 5 entries', async () => {
    const mod = await import('../../src/providers/consumer/registry');
    expect(mod.CONSUMER_TIER1_PROVIDERS).toBeDefined();
    expect(mod.CONSUMER_TIER1_PROVIDERS).toHaveLength(5);
  });

  it('should export CONSUMER_TIER2_PROVIDERS with 5 entries', async () => {
    const mod = await import('../../src/providers/consumer/registry');
    expect(mod.CONSUMER_TIER2_PROVIDERS).toBeDefined();
    expect(mod.CONSUMER_TIER2_PROVIDERS).toHaveLength(5);
  });
});

describe('ConsumerAdapter base class', () => {
  it('should extend ProviderAdapter', async () => {
    const { ConsumerAdapter } = await import('../../src/providers/consumer/base');
    const { ProviderAdapter } = await import('../../src/providers/base');
    expect(ConsumerAdapter.prototype).toBeInstanceOf(ProviderAdapter);
  });
});
