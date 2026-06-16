import type { ProviderConfig } from '../base';

/**
 * OpenRouter adapter configuration.
 * Per D-01: Tier 2 provider — API-first, widely used routing layer.
 * Per D-03: 12-hour crawl frequency for Tier 2 freshness.
 */
export const openrouterConfig: ProviderConfig = {
  name: 'openrouter',
  baseUrl: 'https://openrouter.ai',
  pricingUrl: 'https://openrouter.ai/models',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 12,
  apiKeyOptional: true,
  modelIdFormat: 'openrouter',
  sources: [
    {
      url: 'https://openrouter.ai/models',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
    {
      url: 'https://openrouter.ai/api/v1/models',
      tier: 'tier2',
      sourceType: 'api_docs',
    },
  ],
};
