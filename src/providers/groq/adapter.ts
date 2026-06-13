import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ExtractionResult } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { groqConfig } from './config';

/**
 * Groq provider adapter.
 *
 * CR-05: Uses validated env module instead of raw process.env.
 * IN-01: Uses base class crawl() implementation.
 * IN-02: Uses shared pricingSchema from schemas.ts.
 * IN-03: Uses shared AI client (Mimo or OpenAI).
 * IN-04: Uses base class default normalize().
 */

export class GroqAdapter extends ProviderAdapter {
  config = groqConfig;

  async extract(html: string): Promise<ExtractionResult[]> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract Groq model pricing from this HTML page.
Look for llama, mixtral, gemma models with Groq pricing.
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
      console.error('Groq extraction failed:', error);
      throw error;
    }
  }
}
