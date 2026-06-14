/**
 * Provider links utility for AI Daily.
 * Maps normalized provider names to their docs, API, and playground URLs.
 * Used by the model detail page to render provider link sections.
 */

export interface ProviderLinks {
  docs: string;
  api: string;
  playground: string | null;
}

/**
 * Static map of provider links keyed by normalized provider name (lowercase).
 * Includes aliases for common provider name variations.
 */
export const PROVIDER_LINKS: Record<string, ProviderLinks> = {
  openai: {
    docs: 'https://platform.openai.com/docs',
    api: 'https://platform.openai.com/api-reference',
    playground: 'https://platform.openai.com/playground',
  },
  anthropic: {
    docs: 'https://docs.anthropic.com',
    api: 'https://docs.anthropic.com/api',
    playground: 'https://console.anthropic.com',
  },
  google: {
    docs: 'https://ai.google.dev/docs',
    api: 'https://ai.google.dev/api',
    playground: 'https://aistudio.google.com',
  },
  'google gemini': {
    docs: 'https://ai.google.dev/docs',
    api: 'https://ai.google.dev/api',
    playground: 'https://aistudio.google.com',
  },
  mistral: {
    docs: 'https://docs.mistral.ai',
    api: 'https://docs.mistral.ai/api',
    playground: 'https://console.mistral.ai',
  },
  'mistral ai': {
    docs: 'https://docs.mistral.ai',
    api: 'https://docs.mistral.ai/api',
    playground: 'https://console.mistral.ai',
  },
  cohere: {
    docs: 'https://docs.cohere.com',
    api: 'https://docs.cohere.com/reference',
    playground: 'https://dashboard.cohere.com',
  },
  groq: {
    docs: 'https://console.groq.com/docs',
    api: 'https://console.groq.com/docs/api-reference',
    playground: 'https://console.groq.com/playground',
  },
  together: {
    docs: 'https://docs.together.ai',
    api: 'https://docs.together.ai/reference',
    playground: 'https://api.together.xyz/playground',
  },
  'together ai': {
    docs: 'https://docs.together.ai',
    api: 'https://docs.together.ai/reference',
    playground: 'https://api.together.xyz/playground',
  },
  perplexity: {
    docs: 'https://docs.perplexity.ai',
    api: 'https://docs.perplexity.ai/api-reference',
    playground: null,
  },
  'perplexity ai': {
    docs: 'https://docs.perplexity.ai',
    api: 'https://docs.perplexity.ai/api-reference',
    playground: null,
  },
  xai: {
    docs: 'https://docs.x.ai',
    api: 'https://docs.x.ai/api-reference',
    playground: 'https://console.x.ai',
  },
  fireworks: {
    docs: 'https://docs.fireworks.ai',
    api: 'https://docs.fireworks.ai/api-reference',
    playground: 'https://fireworks.ai/playground',
  },
  'fireworks ai': {
    docs: 'https://docs.fireworks.ai',
    api: 'https://docs.fireworks.ai/api-reference',
    playground: 'https://fireworks.ai/playground',
  },
  deepseek: {
    docs: 'https://platform.deepseek.com/api-docs',
    api: 'https://platform.deepseek.com/api-docs',
    playground: 'https://platform.deepseek.com',
  },
  amazon: {
    docs: 'https://docs.aws.amazon.com/bedrock/',
    api: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/',
    playground: 'https://console.aws.amazon.com/bedrock/',
  },
  aws: {
    docs: 'https://docs.aws.amazon.com/bedrock/',
    api: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/',
    playground: 'https://console.aws.amazon.com/bedrock/',
  },
  'amazon bedrock': {
    docs: 'https://docs.aws.amazon.com/bedrock/',
    api: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/',
    playground: 'https://console.aws.amazon.com/bedrock/',
  },
};

/**
 * Look up provider links by provider name.
 * Normalizes the name (lowercase, trimmed) before lookup.
 * Returns null if the provider is not found in the map.
 */
export function getProviderLinks(providerName: string): ProviderLinks | null {
  const normalized = providerName.toLowerCase().trim();
  return PROVIDER_LINKS[normalized] ?? null;
}
