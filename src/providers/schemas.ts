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
      modelName: z.string(),
      inputPricePer1m: z.number(),
      outputPricePer1m: z.number(),
      contextWindow: z.number(),
    })
  ),
});
