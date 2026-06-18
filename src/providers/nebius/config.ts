import type { ProviderConfig } from '../base';

/**
 * Nebius adapter configuration.
 * Per D-01: Tier 2 provider — GPU/compute and LLM endpoints.
 * Per D-03: 12-hour crawl frequency for Tier 2 freshness.
 */
export const nebiusConfig: ProviderConfig = {
  name: 'nebius',
  baseUrl: 'https://nebius.com',
  pricingUrl: 'https://nebius.com/pricing',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 12,
  apiKeyOptional: true,
  modelIdFormat: 'nebius',
  sources: [
    {
      url: 'https://nebius.com/pricing',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
};
