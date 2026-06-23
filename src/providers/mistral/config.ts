import type { ProviderConfig } from '../base';

/**
 * Mistral adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const mistralConfig: ProviderConfig = {
  name: 'mistral',
  baseUrl: 'https://mistral.ai',
  pricingUrl: 'https://mistral.ai/pricing/',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'mistral',
  sources: [
    {
      url: 'https://mistral.ai/pricing/',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
