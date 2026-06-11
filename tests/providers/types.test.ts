import { describe, it, expect } from 'vitest';
import type { SourceTier, ProviderSource } from '../../src/providers/types';

describe('SourceTier type', () => {
  it('accepts tier1, tier2, tier3 values', () => {
    // TypeScript compile-time check: these assignments must not error
    const t1: SourceTier = 'tier1';
    const t2: SourceTier = 'tier2';
    const t3: SourceTier = 'tier3';
    expect(t1).toBe('tier1');
    expect(t2).toBe('tier2');
    expect(t3).toBe('tier3');
  });
});

describe('ProviderSource interface', () => {
  it('has url, tier, sourceType fields', () => {
    const source: ProviderSource = {
      url: 'https://openai.com/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    };
    expect(source.url).toBe('https://openai.com/pricing');
    expect(source.tier).toBe('tier1');
    expect(source.sourceType).toBe('pricing_page');
  });

  it('accepts all valid sourceType values', () => {
    const types: ProviderSource['sourceType'][] = [
      'pricing_page',
      'api_docs',
      'changelog',
      'blog',
    ];
    expect(types).toHaveLength(4);
  });
});
