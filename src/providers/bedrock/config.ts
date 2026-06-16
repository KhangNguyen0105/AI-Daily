import type { ProviderConfig } from '../base';

export const bedrockConfig: ProviderConfig = {
  name: 'bedrock',
  baseUrl: 'https://aws.amazon.com',
  pricingUrl: 'https://aws.amazon.com/bedrock/pricing/',
  tier: 'tier3',
  currency: 'USD',
  crawlFrequencyHours: 24,
};
