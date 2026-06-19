import type { ConsumerProviderConfig } from '../base';

/**
 * Perplexity consumer adapter configuration.
 * Tier 1 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const perplexityConsumerConfig: ConsumerProviderConfig = {
  name: 'perplexity-consumer',
  baseUrl: 'https://www.perplexity.ai',
  pricingUrl: 'https://www.perplexity.ai/pro',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://www.perplexity.ai/pro',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Perplexity Free', 'Perplexity Pro'],
  adapterTimeoutMs: 30_000,
};
