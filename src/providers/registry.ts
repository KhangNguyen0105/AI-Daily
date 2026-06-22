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
// Tier 2 providers (Wave 5)
import { OpenRouterAdapter } from './openrouter/adapter';
import { NebiusAdapter } from './nebius/adapter';
import { SambaNovaAdapter } from './sambanova/adapter';
import { LeptonAdapter } from './lepton/adapter';
// Tier 2 providers (Wave 6)
import { OpenModelAdapter } from './openmodel/adapter';

/**
 * Explicit adapter registry.
 * Per D-03: A central file imports and registers each adapter.
 * No dynamic loading, no magic — just imports.
 *
 * Per Wave 4: Tier 1 providers expanded from 6 to 10+ with Moonshot/Kimi and MiniMax.
 * Per Wave 5: Tier 2 providers added (7+ providers); Tier 3 providers listed for future expansion.
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
 * Tier 2 provider names.
 * Per D-01: Tier 2 providers are API-first, widely used — second priority.
 * Per D-03: Tier 2 providers get 12-hour crawl frequency.
 * Includes newly created adapters (OpenRouter, Nebius, SambaNova, Lepton)
 * plus existing Tier 1 adapters that also serve as Tier 2 (Together, Fireworks).
 * Note: Groq is Tier 1, not duplicated in Tier 2.
 */
export const TIER2_PROVIDERS = [
  'openrouter',
  'nebius',
  'sambanova',
  'lepton',
  'together',
  'fireworks',
  'cohere',
  'openmodel',
] as const;

export type Tier2ProviderName = (typeof TIER2_PROVIDERS)[number];

/**
 * Tier 3 provider names.
 * Per D-01: Tier 3 providers — aggregators, niche providers, or those with limited transparency.
 * Per D-03: Tier 3 providers get daily crawl frequency.
 * These are registered but may need additional implementation work.
 */
export const TIER3_PROVIDERS = [
  'bedrock',
] as const;

export type Tier3ProviderName = (typeof TIER3_PROVIDERS)[number];

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
 * Get all Tier 2 provider adapters.
 * Per D-01: Tier 2 providers are API-first, widely used.
 * Returns only adapters that are both registered AND in the TIER2_PROVIDERS list.
 */
export function getAllTier2Adapters(): ProviderAdapter[] {
  return TIER2_PROVIDERS
    .map((name) => adapters.get(name))
    .filter((adapter): adapter is ProviderAdapter => adapter !== undefined);
}

/**
 * Get all Tier 3 provider adapters.
 * Per D-01: Tier 3 providers — aggregators and niche providers.
 * Returns only adapters that are both registered AND in the TIER3_PROVIDERS list.
 */
export function getAllTier3Adapters(): ProviderAdapter[] {
  return TIER3_PROVIDERS
    .map((name) => adapters.get(name))
    .filter((adapter): adapter is ProviderAdapter => adapter !== undefined);
}

/**
 * Get ALL provider adapters across all tiers.
 * Per D-01: Returns 20+ providers total (10 Tier 1 + 7 Tier 2 + 1+ Tier 3).
 */
export function getAllProviders(): ProviderAdapter[] {
  return [
    ...getAllTier1Adapters(),
    ...getAllTier2Adapters(),
    ...getAllTier3Adapters(),
  ];
}

/**
 * Get Tier 1 provider names that are registered.
 * Useful for stats tracking and logging.
 */
export function getRegisteredTier1Names(): string[] {
  return TIER1_PROVIDERS.filter((name) => adapters.has(name));
}

/**
 * Get Tier 2 provider names that are registered.
 */
export function getRegisteredTier2Names(): string[] {
  return TIER2_PROVIDERS.filter((name) => adapters.has(name));
}

/**
 * Check if a provider name is a Tier 1 provider.
 */
export function isTier1Provider(name: string): boolean {
  return (TIER1_PROVIDERS as readonly string[]).includes(name);
}

/**
 * Check if a provider name is a Tier 2 provider.
 */
export function isTier2Provider(name: string): boolean {
  return (TIER2_PROVIDERS as readonly string[]).includes(name);
}

/**
 * Check if a provider name is a Tier 3 provider.
 */
export function isTier3Provider(name: string): boolean {
  return (TIER3_PROVIDERS as readonly string[]).includes(name);
}

/**
 * Get the tier classification for a provider name.
 * Returns 'tier1', 'tier2', 'tier3', or undefined if not classified.
 */
export function getProviderTier(name: string): 'tier1' | 'tier2' | 'tier3' | undefined {
  if (isTier1Provider(name)) return 'tier1';
  if (isTier2Provider(name)) return 'tier2';
  if (isTier3Provider(name)) return 'tier3';
  return undefined;
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
// Tier 2 providers (Wave 5): OpenRouter, Nebius, SambaNova, Lepton
registerAdapter(new OpenRouterAdapter());
registerAdapter(new NebiusAdapter());
registerAdapter(new SambaNovaAdapter());
registerAdapter(new LeptonAdapter());
// Tier 2 providers (Wave 6): OpenModel
registerAdapter(new OpenModelAdapter());
