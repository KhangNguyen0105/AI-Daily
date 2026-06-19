import type { ProviderConfig } from '../../base';

/**
 * Gemini consumer adapter configuration.
 * Tier 1 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const geminiConsumerConfig: ProviderConfig & {
  expectedPlanNames: string[];
  adapterTimeoutMs: number;
} = {
  name: 'gemini-consumer',
  baseUrl: 'https://one.google.com',
  pricingUrl: 'https://one.google.com/about/plans',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://one.google.com/about/plans',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Google One AI Premium', 'Gemini Advanced'],
  adapterTimeoutMs: 30_000,
};
