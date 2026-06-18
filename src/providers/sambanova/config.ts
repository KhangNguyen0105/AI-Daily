import type { ProviderConfig } from '../base';

/**
 * SambaNova adapter configuration.
 * Per D-01: Tier 2 provider — API-first LLM provider.
 * Per D-03: 12-hour crawl frequency for Tier 2 freshness.
 */
export const sambanovaConfig: ProviderConfig = {
  name: 'sambanova',
  baseUrl: 'https://sambanova.ai',
  pricingUrl: 'https://cloud.sambanova.ai/plans/pricing',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 12,
  apiKeyOptional: true,
  modelIdFormat: 'sambanova',
  sources: [
    {
      url: 'https://cloud.sambanova.ai/plans/pricing',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
};
