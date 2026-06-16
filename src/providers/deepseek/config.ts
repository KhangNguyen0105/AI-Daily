import type { ProviderConfig } from '../base';

/**
 * DeepSeek adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const deepseekConfig: ProviderConfig = {
  name: 'deepseek',
  baseUrl: 'https://deepseek.com',
  pricingUrl: 'https://platform.deepseek.com/api-docs/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'deepseek',
  sources: [
    {
      url: 'https://platform.deepseek.com/api-docs/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
