import { createOpenAI } from '@ai-sdk/openai';
import { env } from './env';

/**
 * Shared AI client for extraction and generation.
 *
 * Uses Mimo (Xiaomi) if MIMO_API_KEY is set, otherwise falls back to OpenAI.
 * Mimo's API is OpenAI-compatible, so we use @ai-sdk/openai with a custom base URL.
 */

function resolveProvider() {
  if (env.MIMO_API_KEY) {
    return createOpenAI({
      apiKey: env.MIMO_API_KEY,
      baseURL: env.MIMO_BASE_URL,
    });
  }
  if (env.OPENAI_API_KEY) {
    return createOpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  throw new Error(
    'No AI provider configured. Set MIMO_API_KEY or OPENAI_API_KEY in .env'
  );
}

/**
 * Returns the AI model instance for use with generateObject/generateText.
 * Usage: const model = getAIModel(); // uses mimo-v2.5-pro or gpt-4o
 */
export function getAIModel() {
  const provider = resolveProvider();
  return provider.chat(env.MIMO_MODEL);
}
