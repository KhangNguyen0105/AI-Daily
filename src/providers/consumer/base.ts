import { generateObject } from 'ai';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction, ProviderConfig } from '../base';
import { consumerSubscriptionSchema } from '../schemas';
import { getAIModel } from '../../lib/ai-client';

/**
 * Extended provider config for consumer adapters.
 * Adds expectedPlanNames for extraction cross-checking and adapterTimeoutMs for
 * per-adapter timeout control.
 */
export interface ConsumerProviderConfig extends ProviderConfig {
  expectedPlanNames: string[];
  adapterTimeoutMs: number;
}

/**
 * Abstract base class for consumer subscription adapters.
 *
 * Consumer adapters extract subscription plan data (not per-token API pricing)
 * from consumer-facing pricing pages. Each concrete consumer adapter implements
 * `extract()` returning `ProviderExtraction` with `subscriptionPlans` populated
 * and `models` as empty array.
 *
 * Phase 10: Extends ProviderAdapter to reuse existing crawl infrastructure
 * (Playwright-based crawling) while adding subscription-specific semantics.
 *
 * WR-01: Shared extraction logic moved to base class. Subclasses only need to
 * override `buildExtractionPrompt()` for provider-specific prompt text.
 *
 * IN-04: Uses AbortController to cancel in-flight LLM calls on timeout,
 * preventing abandoned generateObject() calls from wasting AI API credits.
 *
 * @example
 * ```typescript
 * class ChatGPTConsumerAdapter extends ConsumerAdapter {
 *   config = chatgptConsumerConfig;
 *   protected buildExtractionPrompt(html: string): string {
 *     return `Extract all consumer subscription plans from this ChatGPT pricing page...`;
 *   }
 * }
 * ```
 */
export abstract class ConsumerAdapter extends ProviderAdapter {
  // Consumer adapters do NOT override crawl() — they reuse the Playwright-based
  // crawl from ProviderAdapter. Each concrete adapter implements extract()
  // to parse subscription-specific data from the crawled HTML.

  /**
   * Typed accessor for the consumer-specific config with expectedPlanNames
   * and adapterTimeoutMs.
   */
  protected get consumerConfig(): ConsumerProviderConfig {
    return this.config as ConsumerProviderConfig;
  }

  /**
   * Shared extraction implementation for all consumer adapters.
   * WR-01: Single implementation replaces 10 near-identical copies.
   * IN-04: Uses AbortController to cancel LLM call on timeout.
   */
  async extract(html: string): Promise<ProviderExtraction> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      // Truncate HTML to ~100K chars to stay within token limits
      const maxHtmlLength = 100_000;
      const truncatedHtml =
        html.length > maxHtmlLength
          ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
          : html;

      // IN-04: Set up timeout that also aborts the LLM call via AbortController
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`${this.config.name} extraction timed out`));
        }, this.consumerConfig.adapterTimeoutMs);
      });

      const extractionPromise = generateObject({
        model: getAIModel(),
        schema: consumerSubscriptionSchema,
        prompt: this.buildExtractionPrompt(truncatedHtml),
        abortSignal: controller.signal,
      });

      const { object } = await Promise.race([extractionPromise, timeoutPromise]);

      // Cross-check plan names against expectedPlanNames
      const expectedNames = this.consumerConfig.expectedPlanNames;
      const plans = object.plans.map((plan) => {
        const matched = expectedNames.some(
          (expected) =>
            plan.planName.toLowerCase().includes(expected.toLowerCase()) ||
            expected.toLowerCase().includes(plan.planName.toLowerCase()),
        );
        return {
          planName: plan.planName,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          annualMonthlyPrice: plan.annualMonthlyPrice,
          rawPriceText: plan.rawPriceText,
          billingPeriod: plan.billingPeriod,
          freeTrialDays: plan.freeTrialDays,
          freeTrialConditions: plan.freeTrialConditions,
          keyFeatures: plan.keyFeatures,
          currency: this.config.currency ?? 'USD',
          sourceUrl: this.config.pricingUrl,
          confidence: matched ? ('likely' as const) : ('low_confidence' as const),
          extractionNotes: matched
            ? null
            : `Plan name "${plan.planName}" not in expected list: ${expectedNames.join(', ')}`,
        };
      });

      return { models: [], promotions: [], subscriptionPlans: plans };
    } catch (error) {
      // Graceful failure — return empty results on timeout or error
      console.error(`${this.config.name} consumer extraction failed:`, error);
      return { models: [], promotions: [], subscriptionPlans: [] };
    } finally {
      // Clear timeout timer and abort any in-flight LLM call
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      controller.abort(); // No-op if already aborted; ensures cleanup
    }
  }

  /**
   * Build the provider-specific extraction prompt.
   * Override in subclass for provider-specific prompt preamble.
   * WR-01: Default implementation covers the common case.
   *
   * @param html - Truncated HTML content from the pricing page
   * @returns The prompt string for generateObject()
   */
  protected buildExtractionPrompt(html: string): string {
    const expectedNames = this.consumerConfig.expectedPlanNames;
    return `Extract all consumer subscription plans from this ${this.config.name} pricing page.
Known plans to look for: ${expectedNames.join(', ')}.

For each plan, extract:
- planName: exact name as shown on page
- monthlyPrice: numeric USD monthly price, or null if not available
- annualPrice: numeric USD annual total, or null if not available
- annualMonthlyPrice: effective monthly when billed annually, or null
- rawPriceText: the exact price text as shown (e.g., "$20/mo")
- billingPeriod: "monthly" if billed monthly, "annual" if billed annually, "one_time" if one-time, "unknown" if unclear
- freeTrialDays: integer, 0 if no trial
- freeTrialConditions: text conditions or null
- keyFeatures: array of feature strings

Return { "plans": [...] } with all fields.
If a price is ambiguous or says "contact sales", set numeric fields to null and capture text in rawPriceText.

HTML content:
${html}`;
  }
}
