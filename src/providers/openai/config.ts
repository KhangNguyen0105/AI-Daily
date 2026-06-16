import type { ProviderConfig } from '../base';

/**
 * OpenAI adapter configuration.
 * Per D-13: OpenAI is the first provider adapter.
 * Per D-14: Core pricing data only.
 */
export const openaiConfig: ProviderConfig = {
  name: 'openai',
  baseUrl: 'https://openai.com',
  pricingUrl: 'https://openai.com/api/pricing/',
};
