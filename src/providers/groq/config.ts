import type { ProviderConfig } from '../base';

/**
 * Groq adapter configuration.
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 */
export const groqConfig: ProviderConfig = {
  name: 'groq',
  baseUrl: 'https://groq.com',
  pricingUrl: 'https://groq.com/pricing/',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 4,
  apiKeyOptional: false,
  modelIdFormat: 'groq',
  sources: [
    {
      url: 'https://groq.com/pricing/',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
};
