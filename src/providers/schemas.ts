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
      modelPattern: z.string().describe("The exact model name or pattern as shown on the page"),
      type: z.enum(['free_tier', 'promotion', 'beta']).describe("The type of the promotion"),
      description: z.string().describe("Exact text from the page about this promotion - DO NOT make up or infer"),
      credits: z.string().nullable().optional().describe("Specific limits if mentioned, e.g. '100 calls/month', '$5 credits', 'rate-limited'"),
      sourceUrl: z.string().nullable().optional().describe("URL where this promotion was found, if different from main page"),
      isTimeLimited: z.boolean().optional().describe("Whether the promotion has an expiration date"),
      expiresAt: z.string().nullable().optional().describe("Expiration date if time-limited, e.g. '2026-12-31' or 'first 2 months'"),
      limits: z.string().nullable().optional().describe("Specific usage limits, e.g. '100 API calls/month', '10K tokens/day'"),
    })
  ).optional(),
});

/**
 * Shared Zod schema for AI-extracted consumer subscription plan data.
 * Phase 10: Validates extraction output for consumer-facing subscription pages.
 * Addresses review finding #2: nullable fields, rawPriceText, billingPeriod.
 */
export const consumerSubscriptionSchema = z.object({
  plans: z.array(
    z.object({
      planName: z.string().describe("The exact name of the subscription plan as shown on the page"),
      monthlyPrice: z.number().nullable().describe("Monthly price in USD as a strictly numeric float, or null if not available or 'contact sales'"),
      annualPrice: z.number().nullable().describe("Annual price in USD (total yearly cost) as a strictly numeric float, or null if not available"),
      annualMonthlyPrice: z.number().nullable().describe("Effective monthly price when billed annually, or null if not derivable"),
      rawPriceText: z.string().nullable().describe("The exact price text as shown on the page, e.g. '$20/mo', 'Starting at $20', 'Contact sales'"),
      billingPeriod: z.enum(['monthly', 'annual', 'one_time', 'unknown']).describe("The billing period for this plan: monthly, annual, one_time, or unknown"),
      freeTrialDays: z.number().nullable().describe("Number of free trial days as integer. 0 if no trial, positive number if trial exists, null if unknown"),
      freeTrialConditions: z.string().nullable().describe("Conditions for free trial, e.g. 'Credit card required', 'New users only'"),
      keyFeatures: z.array(z.string()).describe("List of key features included in the plan"),
    })
  ),
});
