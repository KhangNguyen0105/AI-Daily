import type { ProviderConfig } from '../base';

/**
 * Perplexity adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const perplexityConfig: ProviderConfig = {
  name: 'perplexity',
  baseUrl: 'https://perplexity.ai',
  pricingUrl: 'https://docs.perplexity.ai/guides/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'perplexity',
  sources: [
    {
      url: 'https://docs.perplexity.ai/guides/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
