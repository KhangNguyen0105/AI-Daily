import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ExtractionResult } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { bedrockConfig } from './config';

/**
 * Amazon Bedrock provider adapter.
 *
 * CR-05: Uses validated env module instead of raw process.env.
 * CR-06: Removed dangerous price < 0.01 heuristic. Trust LLM extraction output.
 * IN-01: Uses base class crawl() implementation.
 * IN-02: Uses shared pricingSchema from schemas.ts.
 * IN-03: Uses shared AI client (Mimo or OpenAI).
 */

export class BedrockAdapter extends ProviderAdapter {
  config = bedrockConfig;

  async extract(html: string): Promise<ExtractionResult[]> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract Amazon Bedrock model pricing from this HTML page.
Look for models from multiple providers available through Bedrock (Anthropic, Meta, Cohere, AI21, Mistral, etc.).
IMPORTANT: Bedrock prices may be per-1000-tokens. Convert ALL prices to per-1M-tokens (multiply by 1000).
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
      console.error('Bedrock extraction failed:', error);
      throw error;
    }
  }

  /**
   * CR-06: Normalize Bedrock extractions.
   * Removed the dangerous price < 0.01 heuristic that silently corrupted data.
   * Instead, log suspicious prices for manual review.
   */
  normalize(extractions: ExtractionResult[]): ExtractionResult[] {
    for (const e of extractions) {
      if (e.inputPricePer1m !== null && e.inputPricePer1m > 100) {
        console.warn(
          `[${this.config.name}] Suspicious input price for ${e.modelName}: $${e.inputPricePer1m}/1M tokens. ` +
          'May be per-1K tokens. Manual review recommended.'
        );
      }
      if (e.outputPricePer1m !== null && e.outputPricePer1m > 100) {
        console.warn(
          `[${this.config.name}] Suspicious output price for ${e.modelName}: $${e.outputPricePer1m}/1M tokens. ` +
          'May be per-1K tokens. Manual review recommended.'
        );
      }
    }
    return extractions;
  }
}
