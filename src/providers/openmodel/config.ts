import type { ProviderConfig } from '../base';

/**
 * OpenModel adapter configuration.
 * OpenModel is a multi-model LLM gateway that aggregates models from many providers
 * with discounted pricing (5-75% off provider prices).
 *
 * Tier 2 provider — aggregator/gateway, similar to OpenRouter.
 * 12-hour crawl frequency for Tier 2 freshness.
 */
export const openmodelConfig: ProviderConfig = {
  name: 'openmodel',
  baseUrl: 'https://www.openmodel.ai',
  pricingUrl: 'https://www.openmodel.ai/model-pricing',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 12,
  apiKeyOptional: true,
  modelIdFormat: 'openmodel',
  sources: [
    {
      url: 'https://www.openmodel.ai/model-pricing',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
};
