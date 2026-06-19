import { ConsumerAdapter } from '../base';
import { geminiConsumerConfig } from './config';

/**
 * Gemini consumer subscription adapter.
 * Extracts subscription plan data from one.google.com/about/plans.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Overrides buildExtractionPrompt() for Gemini/Google One specific context.
 */
export class GeminiConsumerAdapter extends ConsumerAdapter {
  config = geminiConsumerConfig;

  protected buildExtractionPrompt(html: string): string {
    const expectedNames = this.consumerConfig.expectedPlanNames;
    return `Extract all consumer subscription plans from this Gemini/Google One pricing page.
Known plans to look for: ${expectedNames.join(', ')}.

For each plan, extract:
- planName: exact name as shown on page
- monthlyPrice: numeric USD monthly price, or null if not available
- annualPrice: numeric USD annual total, or null if not available
- annualMonthlyPrice: effective monthly when billed annually, or null
- rawPriceText: the exact price text as shown (e.g., "$19.99/mo")
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
