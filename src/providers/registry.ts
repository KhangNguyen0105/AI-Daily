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

/**
 * Explicit adapter registry.
 * Per D-03: A central file imports and registers each adapter.
 * No dynamic loading, no magic — just imports.
 */
const adapters: Map<string, ProviderAdapter> = new Map();

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

// Register all adapters (D-03: explicit import)
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
