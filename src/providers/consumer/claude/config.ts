import type { ConsumerProviderConfig } from '../base';

/**
 * Claude consumer adapter configuration.
 * Tier 1 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const claudeConsumerConfig: ConsumerProviderConfig = {
  name: 'claude-consumer',
  baseUrl: 'https://www.anthropic.com',
  pricingUrl: 'https://www.anthropic.com/claude',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://www.anthropic.com/claude',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Claude Free', 'Claude Pro', 'Claude Max', 'Claude Team'],
  adapterTimeoutMs: 30_000,
};
