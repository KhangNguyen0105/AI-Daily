import type { Page } from 'playwright';
import { ConsumerAdapter } from '../base';
import type { CrawlResult } from '../../base';
import { geminiConsumerConfig } from './config';

/**
 * Gemini consumer subscription adapter.
 * Extracts subscription plan data from Google AI/Gemini pricing pages.
 *
 * Strategy: Try multiple URLs in order of protection level:
 * 1. Primary: one.google.com/about/plans (Google One AI Premium)
 * 2. Fallback: ai.google.dev/pricing (Google AI for Developers — less protected)
 * If all fail, falls back to static data.
 */
export class GeminiConsumerAdapter extends ConsumerAdapter {
  config = geminiConsumerConfig;

  protected getLoginUrl(): string | null {
    if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_PASSWORD) {
      return 'https://accounts.google.com/';
    }
    return null;
  }

  protected async performLogin(page: Page): Promise<boolean> {
    const email = process.env.GOOGLE_EMAIL;
    const password = process.env.GOOGLE_PASSWORD;
    if (!email || !password) return false;

    await page.goto('https://accounts.google.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Fill email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(email);

    // Click Next
    const nextBtn = page.locator('#identifierNext, button:has-text("Next")').first();
    await nextBtn.click();
    await page.waitForTimeout(2000);

    // Fill password
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.waitFor({ timeout: 10_000 });
    await pwInput.fill(password);

    // Click Next
    const pwNext = page.locator('#passwordNext, button:has-text("Next")').first();
    await pwNext.click();
    await page.waitForTimeout(3000);

    return true;
  }

  /**
   * Override crawl to try alternative URLs if primary fails.
   * ai.google.dev/pricing is Google's developer-facing pricing page
   * which may have lighter anti-bot protection.
   */
  async crawl(): Promise<CrawlResult> {
    const alternativeUrls = [
      'https://workspace.google.com/products/gemini/pricing',
      'https://ai.google.dev/pricing',
      'https://cloud.google.com/vertex-ai/generative-ai/pricing',
    ];

    // Try primary URL first (with login if configured)
    try {
      return await super.crawl();
    } catch (primaryErr) {
      console.warn(`${this.config.name}: primary URL failed, trying alternatives...`);
    }

    // Try alternative URLs
    for (const altUrl of alternativeUrls) {
      try {
        console.log(`${this.config.name}: trying ${altUrl}`);
        const result = await this.crawlUrl(altUrl);
        if (result.html.length > 5000) {
          console.log(`${this.config.name}: success with ${altUrl} (${result.html.length} bytes)`);
          return result;
        }
      } catch (altErr) {
        console.warn(`${this.config.name}: ${altUrl} failed`);
      }
    }

    // All alternatives failed — fall back to static
    const staticPlans = this.getStaticPlans();
    if (staticPlans.length > 0) {
      console.log(`${this.config.name}: all URLs failed, using static fallback`);
      return {
        url: this.config.pricingUrl,
        html: '<!-- STATIC_FALLBACK -->',
        crawledAt: new Date(),
      };
    }

    throw new Error(`${this.config.name}: all crawl attempts failed`);
  }

  /**
   * Crawl a specific URL using Playwright.
   */
  private async crawlUrl(url: string): Promise<CrawlResult> {
    let result: CrawlResult | null = null;

    const { PlaywrightCrawler } = await import('crawlee');
    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      launchContext: {
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        },
      },
      async requestHandler({ page }) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(3000);
        result = {
          url,
          html: await page.content(),
          crawledAt: new Date(),
        };
      },
    });

    await crawler.run([{ url, uniqueKey: `${url}-${Date.now()}` }]);

    if (!result) {
      throw new Error(`Failed to crawl ${url}`);
    }
    return result;
  }
}
