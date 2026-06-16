import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction, ExtractionResult } from '../base';
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

  async extract(html: string): Promise<ProviderExtraction> {
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

Also extract any news or promotional offers like free trials, free token tiers, or beta access.


IMPORTANT: You MUST return a JSON object with EXACTLY these keys and formats:
{
  "models": [
    {
      "modelName": "string (exact model name)",
      "inputPricePer1m": 0.15, // strictly numeric float, or null. No dollar signs!
      "outputPricePer1m": 0.6, // strictly numeric float, or null. No dollar signs!
      "contextWindow": 128000 // strictly numeric integer, or null. No 'k'!
    }
  ],
  "promotions": [
    {
      "modelPattern": "string",
      "type": "free_tier", // must be "free_tier", "promotion", or "beta"
      "description": "string",
      "credits": "string (optional)"
    }
  ]
}
DO NOT use different keys like "model_name" or "model_pricing".
DO NOT return strings for numbers.\nReturn ONLY valid JSON and absolutely no other text before or after the JSON. No markdown formatting, no backticks.

HTML content:
${truncatedHtml}`,
      });

      return {
        models: object.models.map((model) => ({
          modelName: model.modelName,
          inputPricePer1m: model.inputPricePer1m,
          outputPricePer1m: model.outputPricePer1m,
          contextWindow: model.contextWindow,
          confidence: 'likely' as const,
          rawEvidence: model,
        })),
        promotions: object.promotions || [],
      };
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
  normalize(extractions: ProviderExtraction): ProviderExtraction {
    for (const e of extractions.models) {
      // CR-06: Capture raw price text for evidence anchoring
      if (e.inputPricePer1m !== null) {
        e.rawPriceText = `$${e.inputPricePer1m} per 1M input tokens`;
        e.rawUnit = 'per 1M tokens';
        e.rawCurrency = 'USD';
      }
      if (e.outputPricePer1m !== null) {
        e.rawPriceText = e.rawPriceText
          ? `${e.rawPriceText}; $${e.outputPricePer1m} per 1M output tokens`
          : `$${e.outputPricePer1m} per 1M output tokens`;
      }
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
