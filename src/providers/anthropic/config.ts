import type { ProviderConfig } from '../base';

/**
 * Anthropic adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const anthropicConfig: ProviderConfig = {
  name: 'anthropic',
  baseUrl: 'https://claude.com',
  pricingUrl: 'https://claude.com/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'anthropic',
  sources: [
    {
      url: 'https://claude.com/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
