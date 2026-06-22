import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { openmodelConfig } from './config';

/**
 * OpenModel provider adapter.
 * OpenModel is a multi-model LLM gateway that aggregates models from many providers
 * with discounted pricing (5-75% off provider prices).
 *
 * Per D-01: Tier 2 provider — aggregator/gateway layer.
 * Per D-05: Stores raw_price_text, raw_unit, raw_currency before normalization.
 * Per D-08: Evidence anchoring for all extractions.
 *
 * Notable: OpenModel sometimes offers FREE models as limited events
 * (e.g., DeepSeek V4 Flash free promotion).
 */
export class OpenModelAdapter extends ProviderAdapter {
  config = openmodelConfig;

  async extract(html: string): Promise<ProviderExtraction> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract OpenModel model pricing from this HTML page.
OpenModel is a multi-model LLM gateway that aggregates models from many providers
with discounted pricing. They sometimes offer FREE models as limited events.

IMPORTANT: Look for models marked as "Free" — their inputPricePer1m and outputPricePer1m should be 0.
Also look for discount badges like "5% OFF", "20% OFF", "75% OFF" etc.

Extract input and output prices per million tokens and context window size.

Also extract any promotional offers like free models, free trials, or limited events.

IMPORTANT: You MUST return a JSON object with EXACTLY these keys and formats:
{
  "models": [
    {
      "modelName": "string (exact model name)",
      "inputPricePer1m": 0.15, // strictly numeric float, or null. No dollar signs! Use 0 for FREE models.
      "outputPricePer1m": 0.6, // strictly numeric float, or null. No dollar signs! Use 0 for FREE models.
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
          rawCurrency: 'USD',
          rawUnit: 'per 1M tokens',
          pricingModelType: model.inputPricePer1m === 0 && model.outputPricePer1m === 0
            ? 'free'
            : 'token_usage',
        })),
        promotions: object.promotions || [],
      };
    } catch (error) {
      console.error('OpenModel extraction failed:', error);
      throw error;
    }
  }

  normalize(extractions: ProviderExtraction): ProviderExtraction {
    for (const e of extractions.models) {
      if (e.inputPricePer1m !== null) {
        e.rawPriceText = e.inputPricePer1m === 0
          ? 'Free'
          : `$${e.inputPricePer1m} per 1M input tokens`;
        e.rawUnit = 'per 1M tokens';
        e.rawCurrency = 'USD';
      }
      // CR-06: Also capture output price text for evidence anchoring
      if (e.outputPricePer1m !== null) {
        const outputText = e.outputPricePer1m === 0
          ? 'Free'
          : `$${e.outputPricePer1m} per 1M output tokens`;
        e.rawPriceText = e.rawPriceText
          ? `${e.rawPriceText}; ${outputText}`
          : outputText;
      }
    }
    return extractions;
  }
}
