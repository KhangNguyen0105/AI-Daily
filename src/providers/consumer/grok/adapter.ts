import type { Page } from 'playwright';
import { ConsumerAdapter } from '../base';
import { grokConsumerConfig } from './config';

/**
 * Grok (X/Twitter) consumer subscription adapter.
 * Extracts subscription plan data from x.com/i/premium.
 *
 * Supports login-based crawling: if X_EMAIL and X_PASSWORD env vars
 * are set, the worker logs in at x.com before crawling the pricing page.
 */
export class GrokConsumerAdapter extends ConsumerAdapter {
  config = grokConsumerConfig;

  protected getLoginUrl(): string | null {
    if (process.env.X_EMAIL && process.env.X_PASSWORD) {
      return 'https://x.com/login';
    }
    return null;
  }

  protected async performLogin(page: Page): Promise<boolean> {
    const email = process.env.X_EMAIL;
    const password = process.env.X_PASSWORD;
    if (!email || !password) return false;

    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // X login: username/email field
    const emailInput = page.locator('input[name="text"], input[autocomplete="username"]').first();
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(email);

    // Click Next
    const nextBtn = page.locator('button:has-text("Next"), [role="button"]:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(2000);

    // X may show an extra "enter your phone/username" verification step
    const verifyInput = page.locator('input[name="text"]').first();
    if (await verifyInput.count() > 0) {
      // Re-enter email/username for verification
      await verifyInput.fill(email);
      const nextBtn2 = page.locator('button:has-text("Next"), [role="button"]:has-text("Next")').first();
      await nextBtn2.click();
      await page.waitForTimeout(2000);
    }

    // Password field
    const pwInput = page.locator('input[name="password"], input[type="password"]').first();
    await pwInput.waitFor({ timeout: 10_000 });
    await pwInput.fill(password);

    // Click Log in
    const loginBtn = page.locator('button[data-testid="LoginForm_Login_Button"], button:has-text("Log in"), [role="button"]:has-text("Log in")').first();
    await loginBtn.click();

    // Wait for redirect to home timeline
    await page.waitForURL('https://x.com/**', { timeout: 15_000 });
    await page.waitForTimeout(2000);
    return true;
  }

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
