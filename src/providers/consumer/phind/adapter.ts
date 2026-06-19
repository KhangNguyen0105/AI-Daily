import { generateObject } from 'ai';
import { ConsumerAdapter } from '../base';
import type { ProviderExtraction } from '../../base';
import { consumerSubscriptionSchema } from '../../schemas';
import { getAIModel } from '../../../lib/ai-client';
import { phindConsumerConfig } from './config';

/**
 * Phind consumer subscription adapter.
 * Extracts subscription plan data from phind.com/pro.
 *
 * Review #1: Provider-specific prompt with expectedPlanNames cross-checking.
 * Review #6: Adapter-level timeout via Promise.race.
 * WR-02: Timer cleanup in finally block.
 * IN-03: Use config.currency instead of hardcoded 'USD'.
 */
export class PhindConsumerAdapter extends ConsumerAdapter {
  config = phindConsumerConfig;

  async extract(html: string): Promise<ProviderExtraction> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const maxHtmlLength = 100_000;
      const truncatedHtml =
        html.length > maxHtmlLength
          ? html.slice(0, maxHtmlLength) + '\n<!-- TRUNCATED -->'
          : html;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Phind consumer extraction timed out')),
          this.config.adapterTimeoutMs,
        );
      });

      const extractionPromise = generateObject({
        model: getAIModel(),
        schema: consumerSubscriptionSchema,
        prompt: `Extract all consumer subscription plans from this Phind pricing page.
Known plans to look for: ${this.config.expectedPlanNames.join(', ')}.

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
${truncatedHtml}`,
      });

      const { object } = await Promise.race([extractionPromise, timeoutPromise]);

      const plans = object.plans.map((plan) => {
        const matched = this.config.expectedPlanNames.some(
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
            : `Plan name "${plan.planName}" not in expected list: ${this.config.expectedPlanNames.join(', ')}`,
        };
      });

      return { models: [], promotions: [], subscriptionPlans: plans };
    } catch (error) {
      console.error('Phind consumer extraction failed:', error);
      return { models: [], promotions: [], subscriptionPlans: [] };
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}
