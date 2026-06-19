import type { ConsumerProviderConfig } from '../base';

/**
 * Copilot consumer adapter configuration.
 * Tier 1 consumer provider.
 * Review #1: expectedPlanNames for extraction cross-checking.
 * Review #6: adapterTimeoutMs for per-adapter timeout control.
 */
export const copilotConsumerConfig: ConsumerProviderConfig = {
  name: 'copilot-consumer',
  baseUrl: 'https://copilot.microsoft.com',
  pricingUrl: 'https://copilot.microsoft.com',
  tier: 'tier1',
  currency: 'USD',
  crawlFrequencyHours: 24,
  apiKeyOptional: false,
  modelIdFormat: 'consumer',
  sources: [
    {
      url: 'https://copilot.microsoft.com',
      tier: 'tier1',
      sourceType: 'pricing_page',
    },
  ],
  expectedPlanNames: ['Copilot Free', 'Copilot Pro', 'Copilot for Microsoft 365'],
  adapterTimeoutMs: 30_000,
};
