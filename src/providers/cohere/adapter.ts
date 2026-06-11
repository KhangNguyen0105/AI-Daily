import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ProviderAdapter } from '../base';
import type { ExtractionResult } from '../base';
import { pricingSchema } from '../schemas';
import { env } from '../../lib/env';
import { cohereConfig } from './config';

/**
 * Cohere provider adapter.
 *
 * CR-05: Uses validated env module instead of raw process.env.
 * IN-01: Uses base class crawl() implementation.
 * IN-02: Uses shared pricingSchema from schemas.ts.
 * IN-03: OpenAI client created once at module level.
 * IN-04: Uses base class default normalize().
 */
const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export class CohereAdapter extends ProviderAdapter {
  config = cohereConfig;

  async extract(html: string): Promise<ExtractionResult[]> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: pricingSchema,
        prompt: `Extract Cohere model pricing from this HTML page.
Look for model names like command-r-plus, command-r, command-light, etc.
Convert any non-per-token pricing to per-1M-tokens.
Extract input and output prices per million tokens and context window size.
Only extract models with explicit pricing. Skip models without pricing.

HTML content:
${truncatedHtml}`,
      });

      return object.models.map((model) => ({
        modelName: model.modelName,
        inputPricePer1m: model.inputPricePer1m,
        outputPricePer1m: model.outputPricePer1m,
        contextWindow: model.contextWindow,
        confidence: 'likely' as const,
        rawEvidence: model,
      }));
    } catch (error) {
      console.error('Cohere extraction failed:', error);
      throw error;
    }
  }
}
