import { ConsumerAdapter } from '../base';
import { grokConsumerConfig } from './config';

/**
 * Grok (X/Twitter) consumer subscription adapter.
 * Extracts subscription plan data from x.com/i/premium.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Overrides buildExtractionPrompt() for X/Twitter specific context.
 */
export class GrokConsumerAdapter extends ConsumerAdapter {
  config = grokConsumerConfig;

  protected buildExtractionPrompt(html: string): string {
    const expectedNames = this.consumerConfig.expectedPlanNames;
    return `Extract all consumer subscription plans from this X (Twitter) Premium pricing page.
Known plans to look for: ${expectedNames.join(', ')}.
Note: Grok AI access is bundled with X Premium+ subscriptions.

For each plan, extract:
- planName: exact name as shown on page
- monthlyPrice: numeric USD monthly price, or null if not available
- annualPrice: numeric USD annual total, or null if not available
- annualMonthlyPrice: effective monthly when billed annually, or null
- rawPriceText: the exact price text as shown (e.g., "$16/mo")
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
