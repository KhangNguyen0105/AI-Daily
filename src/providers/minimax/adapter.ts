import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { minimaxConfig } from './config';

/**
 * CNY to USD fallback exchange rate.
 * ~7.25 CNY/USD as of 2026. For production accuracy, fetch the daily rate
 * from the exchange_rates table (which already exists in the schema).
 */
const CNY_TO_USD_FALLBACK = 0.138;

/**
 * MiniMax provider adapter.
 *
 * Chinese AI provider offering abab series models.
 * Pricing is listed in CNY per 1M tokens on the pricing page.
 *
 * Per D-01: Tier 1 provider (high business value, transparent pricing).
 * Per D-03: 4-hour crawl frequency for Tier 1 freshness.
 * Per D-05: Stores raw_price_text, raw_unit, raw_currency before normalization.
 * Per D-08: Evidence anchoring required for all extractions.
 * Per D-04: Provider model IDs for canonical registry matching.
 *
 * Currency: CNY -> USD conversion via daily exchange rate from exchange_rates table.
 */
export class MiniMaxAdapter extends ProviderAdapter {
  config = minimaxConfig;

  /**
   * Extract structured pricing data from crawled HTML using Vercel AI SDK.
   * Per D-14: Extract core pricing data with evidence anchoring.
   * Per T-02-01: Zod schema validates extraction output shape.
   */
  async extract(html: string): Promise<ProviderExtraction> {
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract MiniMax model pricing from this HTML page.
Look for abab5-chat, abab5.5-chat, abab6-chat, abab6.5s-chat, text-davinci-003-mini, etc.
Extract input and output prices per million tokens and context window size.
IMPORTANT: Prices may be listed in CNY (Chinese Yuan). Extract the numeric values as-is.
Only extract models with explicit pricing. Skip models without pricing.

Also extract any news or promotional offers like free trials, free token tiers, or beta access.

IMPORTANT: You MUST return a JSON object with EXACTLY these keys and formats:
{
  "models": [
    {
      "modelName": "string (exact model name)",
      "inputPricePer1m": 0.15, // strictly numeric float, or null. No currency signs!
      "outputPricePer1m": 0.6, // strictly numeric float, or null. No currency signs!
      "contextWindow": 32000 // strictly numeric integer, or null. No 'k'!
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
DO NOT return strings for numbers.
DO NOT include currency symbols in price values.
\nReturn ONLY valid JSON and absolutely no other text before or after the JSON. No markdown formatting, no backticks.

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
          // Per D-05: Store raw currency for CNY providers
          rawCurrency: 'CNY',
          rawUnit: 'per 1M tokens',
          pricingModelType: 'token_usage',
        })),
        promotions: object.promotions || [],
      };
    } catch (error) {
      console.error('MiniMax extraction failed:', error);
      throw error;
    }
  }

  /**
   * Normalize MiniMax extractions.
   * CNY prices are converted to USD using a fallback exchange rate.
   *
   * Per D-05: Preserve raw_price_text alongside normalized values.
   */
  normalize(extractions: ProviderExtraction): ProviderExtraction {
    for (const e of extractions.models) {
      if (e.inputPricePer1m !== null) {
        // Store raw CNY value in rawPriceText
        e.rawPriceText = `${e.inputPricePer1m} CNY per 1M input tokens`;
        e.rawUnit = 'per 1M tokens';
        e.rawCurrency = 'CNY';
        // Convert to USD for the normalized price field
        e.inputPricePer1m = Math.round(e.inputPricePer1m * CNY_TO_USD_FALLBACK * 1000) / 1000;
      }
      // CR-06: Also capture output price text for evidence anchoring
      if (e.outputPricePer1m !== null) {
        const rawOutputCNY = e.outputPricePer1m;
        e.rawPriceText = e.rawPriceText
          ? `${e.rawPriceText}; ${rawOutputCNY} CNY per 1M output tokens`
          : `${rawOutputCNY} CNY per 1M output tokens`;
        // Convert to USD for the normalized price field
        e.outputPricePer1m = Math.round(e.outputPricePer1m * CNY_TO_USD_FALLBACK * 1000) / 1000;
      }
    }
    return extractions;
  }
}
