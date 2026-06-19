import type { Page } from 'playwright';
import { ConsumerAdapter } from '../base';
import { chatgptConsumerConfig } from './config';

/**
 * ChatGPT consumer subscription adapter.
 * Extracts subscription plan data from chatgpt.com/pricing.
 *
 * Supports login-based crawling: if OPENAI_EMAIL and OPENAI_PASSWORD env vars
 * are set, the worker logs in at chatgpt.com before crawling the pricing page.
 * Authenticated users may see actual rendered prices instead of client-side tokens.
 */
export class ChatGPTConsumerAdapter extends ConsumerAdapter {
  config = chatgptConsumerConfig;

  protected getLoginUrl(): string | null {
    if (process.env.OPENAI_EMAIL && process.env.OPENAI_PASSWORD) {
      return 'https://chatgpt.com/';
    }
    return null;
  }

  protected async performLogin(page: Page): Promise<boolean> {
    const email = process.env.OPENAI_EMAIL;
    const password = process.env.OPENAI_PASSWORD;
    if (!email || !password) return false;

    // Navigate to ChatGPT — redirects to auth if not logged in
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Check if already logged in (pricing link visible = logged in)
    const pricingLink = page.locator('a[href="/pricing"]');
    if (await pricingLink.count() > 0) {
      return true; // Already logged in
    }

    // Look for "Log in" button on landing page
    const loginBtn = page.locator('button:has-text("Log in"), a:has-text("Log in")').first();
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
      await page.waitForTimeout(2000);
    }

    // Auth0/ChatGPT login: email field first
    const emailInput = page.locator('input[name="email"], input[name="username"], input[type="email"]').first();
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(email);

    // Click Continue (ChatGPT uses a two-step flow: email → password)
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    await continueBtn.click();
    await page.waitForTimeout(2000);

    // Password field appears after email submission
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.waitFor({ timeout: 10_000 });
    await pwInput.fill(password);

    // Click Continue/Sign in
    const signInBtn = page.locator('button:has-text("Continue"), button:has-text("Sign in"), button[type="submit"]').first();
    await signInBtn.click();

    // Wait for redirect to chatgpt.com (logged in)
    await page.waitForURL('https://chatgpt.com/**', { timeout: 20_000 });
    await page.waitForTimeout(2000);
    return true;
  }
}
