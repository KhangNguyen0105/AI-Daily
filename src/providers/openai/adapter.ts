import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction, ExtractionResult } from '../base';
import { pricingSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';
import { openaiConfig } from './config';

/**
 * OpenAI provider adapter.
 * Per D-13: First provider adapter.
 * Per D-16: Playwright for all pages.
 * Per D-14: Core pricing data extraction.
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
   * Per D-14: Extract core pricing data only.
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
          // Per D-06: Default confidence for AI-extracted data
          confidence: 'likely' as const,
          rawEvidence: model,
        })),
        promotions: object.promotions || [],
      };
    } catch (error) {
      console.error('OpenAI extraction failed:', error);
      // Re-throw so BullMQ retries the job (WR-02)
      throw error;
    }
  }
}
