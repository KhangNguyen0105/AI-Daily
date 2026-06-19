import { generateObject } from 'ai';
import { PlaywrightCrawler } from 'crawlee';
import type { Page } from 'playwright';
import { ProviderAdapter } from '../base';
import type { ProviderExtraction, ProviderConfig, ConsumerSubscriptionPlan, CrawlResult } from '../base';
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
   * Override in subclass to provide static fallback pricing data.
   * Used when live crawling/extraction fails (anti-bot protection, login walls,
   * client-side rendered prices, etc.).
   *
   * Returns an empty array by default (no static fallback).
   * Subclasses with static data should override this method.
   */
  protected getStaticPlans(): Omit<ConsumerSubscriptionPlan, 'currency' | 'sourceUrl' | 'confidence' | 'extractionNotes'>[] {
    return [];
  }

  /**
   * Override in subclass to perform login before crawling.
   * Called inside the Playwright requestHandler, before navigating to pricingUrl.
   * The page is already on a blank page — navigate to login URL, fill credentials, submit.
   *
   * Returns true if login succeeded, false to skip login and proceed without auth.
   */
  protected async performLogin(_page: Page): Promise<boolean> {
    return false; // Default: no login needed
  }

  /**
   * Authenticated crawl — attempts login before crawling the pricing page.
   * Falls back to static data if crawl fails.
   */
  async crawl(): Promise<CrawlResult> {
    let result: CrawlResult | null = null;
    const needsLogin = this.getLoginUrl() !== null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      launchContext: {
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        },
      },
      async requestHandler({ page }) {
        // Step 1: Attempt login if adapter provides credentials
        if (needsLogin) {
          try {
            const loggedIn = await self.performLogin(page);
            if (loggedIn) {
              console.log(`${self.config.name}: login successful`);
            }
          } catch (loginErr) {
            console.warn(`${self.config.name}: login failed, proceeding without auth:`, loginErr);
          }
        }

        // Step 2: Navigate to pricing page
        await page.goto(self.config.pricingUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(3000);

        result = {
          url: self.config.pricingUrl,
          html: await page.content(),
          crawledAt: new Date(),
        };
      },
    });

    const self = this;

    try {
      await crawler.run([
        { url: this.config.pricingUrl, uniqueKey: `${this.config.pricingUrl}-${Date.now()}` },
      ]);
    } catch (error) {
      // Crawl failed — try static fallback
      const staticPlans = this.getStaticPlans();
      if (staticPlans.length > 0) {
        console.log(`${this.config.name}: crawl failed, using static fallback data (${staticPlans.length} plans)`);
        return {
          url: this.config.pricingUrl,
          html: '<!-- STATIC_FALLBACK -->',
          crawledAt: new Date(),
        };
      }
      throw error;
    }

    if (!result) {
      throw new Error(`Failed to crawl ${this.config.name} pricing page at ${this.config.pricingUrl}`);
    }
    return result;
  }

  /**
   * Get the login URL for this provider. Override in subclass.
   * Returns null if no login is needed.
   */
  protected getLoginUrl(): string | null {
    return null;
  }

  /**
   * Shared extraction implementation for all consumer adapters.
   * WR-01: Single implementation replaces 10 near-identical copies.
   * IN-04: Uses AbortController to cancel LLM call on timeout.
   */
  async extract(html: string): Promise<ProviderExtraction> {
    // Detect static fallback marker from crawl()
    if (html === '<!-- STATIC_FALLBACK -->') {
      return this.buildStaticFallback();
    }

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

      // If extraction returned plans but all prices are null, fall back to static data
      const hasUsefulPrices = plans.some(p => p.monthlyPrice !== null || p.annualPrice !== null || p.annualMonthlyPrice !== null);
      if (plans.length === 0 || !hasUsefulPrices) {
        const staticPlans = this.getStaticPlans();
        if (staticPlans.length > 0) {
          console.log(`${this.config.name}: LLM extraction returned no useful prices, using static fallback`);
          return this.buildStaticFallback();
        }
      }

      return { models: [], promotions: [], subscriptionPlans: plans };
    } catch (error) {
      // Graceful failure — fall back to static data if available
      console.error(`${this.config.name} consumer extraction failed:`, error);
      return this.buildStaticFallback();
    } finally {
      // Clear timeout timer and abort any in-flight LLM call
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      controller.abort(); // No-op if already aborted; ensures cleanup
    }
  }

  /**
   * Build a ProviderExtraction from static fallback data.
   * Used when live crawling/extraction fails.
   */
  private buildStaticFallback(): ProviderExtraction {
    const staticPlans = this.getStaticPlans();
    if (staticPlans.length === 0) {
      return { models: [], promotions: [], subscriptionPlans: [] };
    }

    const plans = staticPlans.map(plan => ({
      ...plan,
      currency: this.config.currency ?? 'USD',
      sourceUrl: this.config.pricingUrl,
      confidence: 'likely' as const,
      extractionNotes: 'Static fallback data — live crawl failed',
    }));

    return { models: [], promotions: [], subscriptionPlans: plans };
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
