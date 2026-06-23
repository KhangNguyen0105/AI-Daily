import type { ConsumerProviderConfig } from '../base';

/**
 * Cursor consumer adapter configuration.
 * Tier 2 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const cursorConsumerConfig: ConsumerProviderConfig = {
  name: 'cursor-consumer',
  baseUrl: 'https://www.cursor.com',
  pricingUrl: 'https://www.cursor.com/pricing',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://www.cursor.com/pricing',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Hobby', 'Pro', 'Pro+', 'Ultra', 'Teams'],
  adapterTimeoutMs: 45_000,
};
