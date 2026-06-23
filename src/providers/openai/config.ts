import type { ProviderConfig } from '../base';

/**
 * OpenAI adapter configuration.
 * Per D-13: OpenAI is the first provider adapter.
 * Per D-14: Core pricing data only.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const openaiConfig: ProviderConfig = {
  name: 'openai',
  baseUrl: 'https://openai.com',
  pricingUrl: 'https://platform.openai.com/docs/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'openai',
  sources: [
    {
      url: 'https://platform.openai.com/docs/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
