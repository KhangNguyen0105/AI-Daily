import type { ConsumerProviderConfig } from '../base';

/**
 * Poe consumer adapter configuration.
 * Tier 2 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const poeConsumerConfig: ConsumerProviderConfig = {
  name: 'poe-consumer',
  baseUrl: 'https://poe.com',
  pricingUrl: 'https://poe.com/subscribe',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://poe.com/subscribe',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Poe Free', 'Poe Subscription'],
  // Review #6: Tier 2 gets 45s timeout (longer than Tier 1)
  adapterTimeoutMs: 45_000,
};
