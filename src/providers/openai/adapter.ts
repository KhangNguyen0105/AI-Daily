import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { openaiConfig } from './config';

/**
 * OpenAI provider adapter.
 * Per D-13: First provider adapter.
 * Per D-16: Playwright for all pages.
 * Per D-14: Core pricing data extraction.
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
export class OpenAIAdapter extends ProviderAdapter {
  config = openaiConfig;

  /**
   * Extract structured pricing data from crawled HTML using Vercel AI SDK.
   * Per D-14: Extract core pricing data with evidence anchoring.
   * Per T-02-01: Zod schema validates extraction output shape.
   */
  async extract(html: string): Promise<ProviderExtraction> {
    try {
      // Truncate HTML to ~100K chars to stay within token limits (WR-03)
      const maxHtmlLength = 100_000;
      const truncatedHtml = html.length > maxHtmlLength
        ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
        : html;

      const { object } = await generateObject({
        model: getAIModel(),
        schema: pricingSchema,
        prompt: `Extract all AI model pricing data from this HTML page.
Return an array of models with their name, input price per 1M tokens, output price per 1M tokens, and context window size.
Only extract models that have explicit pricing listed. Skip models marked as "contact sales" or without pricing.
Extract every single model listed with explicit pricing, including both the very latest state-of-the-art models and any legacy models.

IMPORTANT RULES FOR PROMOTIONS:
- ONLY extract promotions that are EXPLICITLY mentioned on the page
- DO NOT hallucinate or infer promotions that are not clearly stated
- For free tier offers, you MUST see explicit text like "free tier", "free of charge", "$0", or "free" next to the model
- For discounts, you MUST see explicit percentage or dollar amounts
- If no promotions are mentioned, return an empty array: "promotions": []
- Include specific limits when mentioned (e.g., "100 calls/month", "$5 credits", "rate-limited")
- Include expiration dates if mentioned (e.g., "first 2 months", "until Dec 2026")

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
      "modelPattern": "string (exact model name or pattern from the page)",
      "type": "free_tier", // must be "free_tier", "promotion", or "beta"
      "description": "string (exact text from the page about this promotion)",
      "credits": "string (optional - specific limits like '100 calls/month' or '$5 credits')"
    }
  ]
}
DO NOT use different keys like "model_name" or "model_pricing".
DO NOT return strings for numbers.
DO NOT make up promotions that are not explicitly stated on the page.
Return ONLY valid JSON and absolutely no other text before or after the JSON. No markdown formatting, no backticks.

HTML content:
${truncatedHtml}`,
      });

      return {
        models: object.models.map((model) => ({
          modelName: model.modelName,
          inputPricePer1m: model.inputPricePer1m,
          outputPricePer1m: model.outputPricePer1m,
          contextWindow: model.contextWindow,
          // Per D-06: Default confidence for AI-extracted data
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
      console.error('OpenAI extraction failed:', error);
      // Re-throw so BullMQ retries the job (WR-02)
      throw error;
    }
  }

  /**
   * Normalize OpenAI extractions.
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
