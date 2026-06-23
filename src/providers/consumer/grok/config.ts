import type { ConsumerProviderConfig } from '../base';

/**
 * Grok (X/Twitter) consumer adapter configuration.
 * Tier 2 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const grokConsumerConfig: ConsumerProviderConfig = {
  name: 'grok-consumer',
  baseUrl: 'https://x.com',
  pricingUrl: 'https://x.com/i/premium',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://x.com/i/premium',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['X Basic', 'X Premium', 'X Premium+'],
  adapterTimeoutMs: 45_000,
};
