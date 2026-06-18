import type { ProviderConfig } from '../base';

/**
 * MiniMax adapter configuration.
 * Chinese AI provider with models: abab5-chat, abab5.5-chat, abab6-chat.
 * Pricing in CNY per 1M tokens — converted to USD using daily exchange rate.
 *
 * Per D-01: Tier 1 provider (highest business value, pricing transparency).
 * Per D-03: Crawl every 2-4 hours (4-hour schedule).
 */
export const minimaxConfig: ProviderConfig = {
  name: 'minimax',
  baseUrl: 'https://www.minimaxi.com',
  pricingUrl: 'https://www.minimaxi.com/pricing',
  tier: 'tier1',
  currency: 'CNY',
  crawlFrequencyHours: 4,
  apiKeyOptional: true,
  modelIdFormat: 'minimax',
  sources: [
    {
      url: 'https://www.minimaxi.com/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
