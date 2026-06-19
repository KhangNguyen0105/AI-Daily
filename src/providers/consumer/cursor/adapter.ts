import { ConsumerAdapter } from '../base';
import { cursorConsumerConfig } from './config';

/**
 * Cursor consumer subscription adapter.
 * Extracts subscription plan data from cursor.com/pricing.
 *
 * WR-01: Shared extraction logic moved to ConsumerAdapter base class.
 * Overrides buildExtractionPrompt() for Cursor-specific context.
 */
export class CursorConsumerAdapter extends ConsumerAdapter {
  config = cursorConsumerConfig;

  protected buildExtractionPrompt(html: string): string {
    const expectedNames = this.consumerConfig.expectedPlanNames;
    return `Extract all consumer subscription plans from this Cursor pricing page.
Known plans to look for: ${expectedNames.join(', ')}.
Cursor is an AI-powered code editor with subscription tiers.

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
