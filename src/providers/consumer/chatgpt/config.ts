import type { ConsumerProviderConfig } from '../base';

/**
 * ChatGPT consumer adapter configuration.
 * Tier 1 consumer provider (highest priority).
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const chatgptConsumerConfig: ConsumerProviderConfig = {
  name: 'chatgpt-consumer',
  baseUrl: 'https://chatgpt.com',
  pricingUrl: 'https://chatgpt.com/pricing',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://chatgpt.com/pricing',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
  // Review #1: Known plan names for extraction cross-checking
  expectedPlanNames: ['Free', 'Go', 'Plus', 'Pro'],
  // Review #6: Per-adapter timeout (30s for Tier 1)
  adapterTimeoutMs: 30_000,
};
