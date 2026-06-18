import { z } from 'zod';

/**
 * Shared Zod schema for AI-extracted pricing data.
 * IN-02: Defined once here instead of copy-pasted into all 12 adapters.
 * Per D-14: Core pricing data only (model name, input price, output price, context window).
 * Per T-02-01: Zod validates extraction output shape; invalid data rejected.
 */
export const pricingSchema = z.object({
  models: z.array(
    z.object({
      modelName: z.string().describe("The exact name of the model"),
      inputPricePer1m: z.number().nullable().describe("Input price per 1M tokens as a strictly numeric float (e.g. 0.15). Do NOT include dollar signs."),
      outputPricePer1m: z.number().nullable().describe("Output price per 1M tokens as a strictly numeric float (e.g. 0.6). Do NOT include dollar signs."),
      contextWindow: z.number().nullable().describe("Context window size as a strictly numeric integer (e.g. 128000). Do NOT include 'k' or 'm'."),
    })
  ),
  promotions: z.array(
    z.object({
      modelPattern: z.string().describe("The name or pattern of the models the promotion applies to"),
      type: z.enum(['free_tier', 'promotion', 'beta']).describe("The type of the promotion"),
      description: z.string().describe("A brief description of the promotion, e.g. 'Free trial for 14 days'"),
      credits: z.string().nullable().optional().describe("Any free credits or tokens provided, e.g. '$50' or '1M tokens'"),
    })
  ).optional(),
});
