import type { ConsumerAdapter } from './base';

/**
 * Explicit consumer adapter registry.
 * Phase 10: Separate from API provider registry to avoid forcing
 * consumer products into API-provider semantics.
 *
 * Tier 1 (must-have): ChatGPT, Gemini, Claude, Perplexity, Copilot
 * Tier 2 (should-have): Poe, Grok, You.com, Phind, Cursor
 */
const consumerAdapters: Map<string, ConsumerAdapter> = new Map();

/**
 * Tier 1 consumer provider names.
 * These are the highest-priority consumer AI products.
 */
export const CONSUMER_TIER1_PROVIDERS = [
  'chatgpt-consumer',
  'gemini-consumer',
  'claude-consumer',
  'perplexity-consumer',
  'copilot-consumer',
] as const;

export type ConsumerTier1ProviderName = (typeof CONSUMER_TIER1_PROVIDERS)[number];

/**
 * Tier 2 consumer provider names.
 * These are secondary consumer AI products.
 */
export const CONSUMER_TIER2_PROVIDERS = [
  'poe-consumer',
  'grok-consumer',
  'you-consumer',
  'phind-consumer',
  'cursor-consumer',
] as const;

export type ConsumerTier2ProviderName = (typeof CONSUMER_TIER2_PROVIDERS)[number];

/**
 * Register a consumer adapter by its config.name.
 */
export function registerConsumerAdapter(adapter: ConsumerAdapter): void {
  consumerAdapters.set(adapter.config.name, adapter);
}

/**
 * Retrieve a registered consumer adapter by name.
 * Returns undefined if no adapter is registered with that name.
 */
export function getConsumerAdapter(name: string): ConsumerAdapter | undefined {
  return consumerAdapters.get(name);
}

/**
 * Get all registered consumer adapters as an array.
 */
export function getAllConsumerAdapters(): ConsumerAdapter[] {
  return Array.from(consumerAdapters.values());
}

/**
 * Get ALL consumer providers (Tier 1 + Tier 2).
 */
export function getAllConsumerProviders(): ConsumerAdapter[] {
  return [
    ...getAllConsumerTier1Adapters(),
    ...getAllConsumerTier2Adapters(),
  ];
}

/**
 * Get all Tier 1 consumer adapters.
 * Returns only adapters that are both registered AND in the CONSUMER_TIER1_PROVIDERS list.
 */
export function getAllConsumerTier1Adapters(): ConsumerAdapter[] {
  return CONSUMER_TIER1_PROVIDERS
    .map((name) => consumerAdapters.get(name))
    .filter((adapter): adapter is ConsumerAdapter => adapter !== undefined);
}

/**
 * Get all Tier 2 consumer adapters.
 * Returns only adapters that are both registered AND in the CONSUMER_TIER2_PROVIDERS list.
 */
export function getAllConsumerTier2Adapters(): ConsumerAdapter[] {
  return CONSUMER_TIER2_PROVIDERS
    .map((name) => consumerAdapters.get(name))
    .filter((adapter): adapter is ConsumerAdapter => adapter !== undefined);
}

/**
 * Check if a provider name is a Tier 1 consumer provider.
 */
export function isConsumerTier1Provider(name: string): boolean {
  return (CONSUMER_TIER1_PROVIDERS as readonly string[]).includes(name);
}

/**
 * Check if a provider name is a Tier 2 consumer provider.
 */
export function isConsumerTier2Provider(name: string): boolean {
  return (CONSUMER_TIER2_PROVIDERS as readonly string[]).includes(name);
}
