import type { Page } from 'playwright';
import { ConsumerAdapter } from '../base';
import { poeConsumerConfig } from './config';

/**
 * Poe consumer subscription adapter.
 * Extracts subscription plan data from poe.com/subscribe.
 *
 * Supports login-based crawling: if POE_EMAIL and POE_PASSWORD env vars
 * are set, the worker logs in before crawling the pricing page.
 */
export class PoeConsumerAdapter extends ConsumerAdapter {
  config = poeConsumerConfig;

  protected getLoginUrl(): string | null {
    if (process.env.POE_EMAIL && process.env.POE_PASSWORD) {
      return 'https://poe.com/login';
    }
    return null;
  }

  protected async performLogin(page: Page): Promise<boolean> {
    const email = process.env.POE_EMAIL;
    const password = process.env.POE_PASSWORD;
    if (!email || !password) return false;

    await page.goto('https://poe.com/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(email);

    // Fill password
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.waitFor({ timeout: 5_000 });
    await pwInput.fill(password);

    // Click sign in
    const signInBtn = page.locator('button:has-text("Log In"), button:has-text("Sign in"), button[type="submit"]').first();
    await signInBtn.click();

    // Wait for redirect away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    return true;
  }
}
