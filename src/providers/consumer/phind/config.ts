import type { ProviderConfig } from '../../base';

/**
 * Phind consumer adapter configuration.
 * Tier 2 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const phindConsumerConfig: ProviderConfig & {
  expectedPlanNames: string[];
  adapterTimeoutMs: number;
} = {
  name: 'phind-consumer',
  baseUrl: 'https://www.phind.com',
  pricingUrl: 'https://www.phind.com/pro',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://www.phind.com/pro',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Phind Free', 'Phind Pro'],
  adapterTimeoutMs: 45_000,
};
