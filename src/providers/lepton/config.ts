import type { ProviderConfig } from '../base';

/**
 * Lepton AI adapter configuration.
 * Per D-01: Tier 2 provider — per 1M tokens + serverless compute.
 * Per D-03: 12-hour crawl frequency for Tier 2 freshness.
 */
export const leptonConfig: ProviderConfig = {
  name: 'lepton',
  baseUrl: 'https://lepton.ai',
  pricingUrl: 'https://www.nvidia.com/en-us/data-center/dgx-cloud-lepton/pricing',
  tier: 'tier2',
  currency: 'USD',
  crawlFrequencyHours: 12,
  apiKeyOptional: true,
  modelIdFormat: 'lepton',
  sources: [
    {
      url: 'https://www.nvidia.com/en-us/data-center/dgx-cloud-lepton/pricing',
      tier: 'tier2',
      sourceType: 'pricing_page',
    },
  ],
};
