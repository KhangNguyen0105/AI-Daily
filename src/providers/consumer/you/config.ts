import type { ConsumerProviderConfig } from '../base';

/**
 * You.com consumer adapter configuration.
 * Tier 2 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const youConsumerConfig: ConsumerProviderConfig = {
  name: 'you-consumer',
  baseUrl: 'https://you.com',
  pricingUrl: 'https://you.com/pro',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://you.com/pro',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['You.com Free', 'YouPro'],
  adapterTimeoutMs: 45_000,
};
