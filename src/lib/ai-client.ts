import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { env } from './env';

/**
 * Shared AI client for extraction and generation.
 *
 * Uses Mimo (Xiaomi) if MIMO_API_KEY is set, otherwise falls back to OpenAI
 * or Anthropic. Mimo's API is OpenAI-compatible, so we use @ai-sdk/openai
 * with a custom base URL.
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
  if (env.ANTHROPIC_API_KEY) {
    return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  throw new Error(
    'No AI provider configured. Set MIMO_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env'
  );
}

/**
 * Returns the AI model instance for use with generateObject/generateText.
 *
 * WR-10: Provider-aware model selection — uses the correct model name for
 * the active provider instead of always using env.MIMO_MODEL.
 */
export function getAIModel() {
  if (env.MIMO_API_KEY) {
    const provider = createOpenAI({
      apiKey: env.MIMO_API_KEY,
      baseURL: env.MIMO_BASE_URL,
    });
    return provider.chat(env.MIMO_MODEL);
  }
  if (env.OPENAI_API_KEY) {
    const provider = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    return provider.chat('gpt-4o');
  }
  if (env.ANTHROPIC_API_KEY) {
    const provider = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return provider.chat('claude-sonnet-4-20250514');
  }
  throw new Error(
    'No AI provider configured. Set MIMO_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env'
  );
}
