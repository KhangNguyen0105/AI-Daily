import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction, ExtractionResult, ExtractionEvidence, EvidenceQuote } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { mistralConfig } from './config';

/**
 * Mistral provider adapter.
 *
 * Per D-01: Tier 1 provider (highest business value).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 * Per D-05: Stores raw_price_text, raw_unit, raw_currency before normalization.
 * Per D-08: Evidence anchoring required for all extractions.
 *
 * CR-05: Uses validated env module instead of raw process.env.
 * IN-01: Uses base class crawl() implementation.
 * IN-02: Uses shared pricingSchema from schemas.ts.
 * IN-03: Uses shared AI client (Mimo or OpenAI).
 * IN-04: Uses base class default normalize().
 */
export class MistralAdapter extends ProviderAdapter {
  config = mistralConfig;

  async extract(html: string): Promise<ProviderExtraction> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract Mistral model pricing from this HTML page.
Extract every single model listed with explicit pricing, including both the very latest state-of-the-art models and any legacy models.
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
          // Per D-05: Store raw currency and unit for USD providers
          rawCurrency: 'USD',
          rawUnit: 'per 1M tokens',
          pricingModelType: 'token_usage',
        })),
        promotions: object.promotions || [],
      };
    } catch (error) {
      console.error('Mistral extraction failed:', error);
      throw error;
    }
  }

  /**
   * Normalize Mistral extractions.
   * Per D-05: Preserve raw_price_text alongside normalized values.
   */
  normalize(extractions: ProviderExtraction): ProviderExtraction {
    for (const e of extractions.models) {
      if (e.inputPricePer1m !== null) {
        e.rawPriceText = `$${e.inputPricePer1m} per 1M input tokens`;
        e.rawUnit = 'per 1M tokens';
        e.rawCurrency = 'USD';
      }
      // CR-06: Also capture output price text for evidence anchoring
      if (e.outputPricePer1m !== null) {
        e.rawPriceText = e.rawPriceText
          ? `${e.rawPriceText}; $${e.outputPricePer1m} per 1M output tokens`
          : `$${e.outputPricePer1m} per 1M output tokens`;
      }
    }
    return extractions;
  }
}
