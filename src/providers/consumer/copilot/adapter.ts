import type { Page } from 'playwright';
import { ConsumerAdapter } from '../base';
import { copilotConsumerConfig } from './config';

/**
 * Copilot consumer subscription adapter.
 * Extracts subscription plan data from copilot.microsoft.com.
 *
 * Supports login-based crawling: if MS_EMAIL and MS_PASSWORD env vars
 * are set, the worker logs in with Microsoft account before crawling.
 * Authenticated users see Copilot Pro pricing and subscription options.
 */
export class CopilotConsumerAdapter extends ConsumerAdapter {
  config = copilotConsumerConfig;

  protected getLoginUrl(): string | null {
    if (process.env.MS_EMAIL && process.env.MS_PASSWORD) {
      return 'https://login.live.com/';
    }
    return null;
  }

  protected async performLogin(page: Page): Promise<boolean> {
    const email = process.env.MS_EMAIL;
    const password = process.env.MS_PASSWORD;
    if (!email || !password) return false;

    // Navigate to Microsoft login
    await page.goto('https://login.live.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Fill email
    const emailInput = page.locator('input[name="loginfmt"], input[type="email"]').first();
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(email);

    // Click Next
    const nextBtn = page.locator('input[type="submit"], button:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(2000);

    // Fill password
    const pwInput = page.locator('input[name="passwd"], input[type="password"]').first();
    await pwInput.waitFor({ timeout: 10_000 });
    await pwInput.fill(password);

    // Click Sign in
    const signInBtn = page.locator('input[type="submit"], button:has-text("Sign in")').first();
    await signInBtn.click();
    await page.waitForTimeout(3000);

    // Handle "Stay signed in?" prompt
    const staySignedIn = page.locator('input[type="submit"][value="Yes"], button:has-text("Yes")').first();
    if (await staySignedIn.count() > 0) {
      await staySignedIn.click();
      await page.waitForTimeout(2000);
    }

    return true;
  }
}
