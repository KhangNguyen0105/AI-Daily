import type { ProviderConfig } from '../base';

/**
 * Google adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const googleConfig: ProviderConfig = {
  name: 'google',
  baseUrl: 'https://ai.google.dev',
  pricingUrl: 'https://ai.google.dev/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'google',
  sources: [
    {
      url: 'https://ai.google.dev/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
