import type { ProviderConfig } from '../base';

/**
 * xAI adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const xaiConfig: ProviderConfig = {
  name: 'xai',
  baseUrl: 'https://x.ai',
  pricingUrl: 'https://docs.x.ai/docs/models',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'xai',
  sources: [
    {
      url: 'https://docs.x.ai/docs/models',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
