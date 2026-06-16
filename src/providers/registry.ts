import { ProviderAdapter } from './base';
import { OpenAIAdapter } from './openai/adapter';
import { AnthropicAdapter } from './anthropic/adapter';
import { GoogleAdapter } from './google/adapter';
import { MistralAdapter } from './mistral/adapter';
import { CohereAdapter } from './cohere/adapter';
import { GroqAdapter } from './groq/adapter';
import { TogetherAdapter } from './together/adapter';
import { PerplexityAdapter } from './perplexity/adapter';
import { XAIAdapter } from './xai/adapter';
import { FireworksAdapter } from './fireworks/adapter';
import { DeepSeekAdapter } from './deepseek/adapter';
import { BedrockAdapter } from './bedrock/adapter';
import { MoonshotAdapter } from './moonshot/adapter';
import { MiniMaxAdapter } from './minimax/adapter';

/**
 * Explicit adapter registry.
 * Per D-03: A central file imports and registers each adapter.
 * No dynamic loading, no magic — just imports.
 *
 * Per Wave 4: Tier 1 providers expanded from 6 to 10+ with Moonshot/Kimi and MiniMax.
 */
const adapters: Map<string, ProviderAdapter> = new Map();

/**
 * Tier 1 provider names.
 * Per D-01: Tier 1 providers are critical — highest business value and pricing transparency.
 * These providers get 4-hour crawl frequency and priority in orchestration.
 */
export const TIER1_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'mistral',
  'moonshot',
  'minimax',
  'perplexity',
  'groq',
] as const;

export type Tier1ProviderName = (typeof TIER1_PROVIDERS)[number];

/**
 * Register a provider adapter by its config.name.
 */
export function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.config.name, adapter);
}

/**
 * Retrieve a registered adapter by name.
 * Returns undefined if no adapter is registered with that name.
 */
export function getAdapter(name: string): ProviderAdapter | undefined {
  return adapters.get(name);
}

/**
 * Get all registered adapters as an array.
 */
export function getAllAdapters(): ProviderAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Get all Tier 1 provider adapters.
 * Per D-01: Tier 1 providers prioritized in orchestration.
 * Returns only adapters that are both registered AND in the TIER1_PROVIDERS list.
 */
export function getAllTier1Adapters(): ProviderAdapter[] {
  return TIER1_PROVIDERS
    .map((name) => adapters.get(name))
    .filter((adapter): adapter is ProviderAdapter => adapter !== undefined);
}

/**
 * Get Tier 1 provider names that are registered.
 * Useful for stats tracking and logging.
 */
export function getRegisteredTier1Names(): string[] {
  return TIER1_PROVIDERS.filter((name) => adapters.has(name));
}

/**
 * Check if a provider name is a Tier 1 provider.
 */
export function isTier1Provider(name: string): boolean {
  return (TIER1_PROVIDERS as readonly string[]).includes(name);
}

// Register all adapters (D-03: explicit import)
// Tier 1 providers (10): OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Moonshot, MiniMax, Perplexity, Groq
registerAdapter(new OpenAIAdapter());
registerAdapter(new AnthropicAdapter());
registerAdapter(new GoogleAdapter());
registerAdapter(new MistralAdapter());
registerAdapter(new CohereAdapter());
registerAdapter(new GroqAdapter());
registerAdapter(new TogetherAdapter());
registerAdapter(new PerplexityAdapter());
registerAdapter(new XAIAdapter());
registerAdapter(new FireworksAdapter());
registerAdapter(new DeepSeekAdapter());
registerAdapter(new BedrockAdapter());
registerAdapter(new MoonshotAdapter());
registerAdapter(new MiniMaxAdapter());
