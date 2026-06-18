import type { ProviderConfig } from '../base';

/**
 * Moonshot/Kimi adapter configuration.
 * Chinese AI provider with models: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k.
 * Pricing in CNY per 1M tokens — converted to USD using daily exchange rate.
 *
 * Per D-01: Tier 1 provider (highest business value, pricing transparency).
 * Per D-03: Crawl every 2-4 hours (4-hour schedule).
 */
export const moonshotConfig: ProviderConfig = {
  name: 'moonshot',
  baseUrl: 'https://www.moonshot.cn',
  pricingUrl: 'https://www.moonshot.cn/pricing',
  tier: 'tier1',
  currency: 'CNY',
  crawlFrequencyHours: 4,
  apiKeyOptional: true,
  modelIdFormat: 'moonshot',
  sources: [
    {
      url: 'https://www.moonshot.cn/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
