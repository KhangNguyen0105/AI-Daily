import { PlaywrightCrawler } from 'crawlee';

/**
 * Configuration for a provider adapter.
 * Each adapter provides its name, base URL, and pricing page URL.
 */
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  pricingUrl: string;
}

/**
 * Result of crawling a provider's pricing page.
 * Contains the raw HTML and metadata about the crawl.
 */
export interface CrawlResult {
  url: string;
  html: string;
  crawledAt: Date;
}

/**
 * Structured extraction of pricing data from a provider.
 * Maps to the `extractions` table in the database.
 */
export interface ExtractionResult {
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  rawEvidence: string;
}

/**
 * Abstract base class for provider adapters.
 *
 * Per D-04: The base class handles infrastructure (Crawlee crawler setup).
 * Each adapter provides configuration and extraction logic.
 *
 * Per D-01: Adapters extend this base class. The base provides a default
 * crawl() implementation using Crawlee PlaywrightCrawler.
 *
 * Per D-02: Each adapter implements crawl(), extract(), and normalize().
 */
export abstract class ProviderAdapter {
  abstract config: ProviderConfig;

  /**
   * Extract structured pricing data from crawled HTML.
   * Subclasses implement provider-specific extraction logic.
   */
  abstract extract(html: string): Promise<ExtractionResult[]>;

  /**
   * Normalize extracted data to the standard format.
   * Subclasses can map confidence levels, adjust pricing, etc.
   */
  abstract normalize(extractions: ExtractionResult[]): ExtractionResult[];

  /**
   * Default crawl implementation using Crawlee PlaywrightCrawler.
   * Per D-16: Playwright for all pages, no HTTP-first fallback.
   * Per D-04: Base class handles infrastructure.
   *
   * Subclasses can override this for custom crawl behavior.
   */
  async crawl(): Promise<CrawlResult> {
    let result: CrawlResult | null = null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      async requestHandler({ page, request }) {
        const html = await page.content();
        result = {
          url: request.loadedUrl ?? request.url,
          html,
          crawledAt: new Date(),
        };
      },
    });

    await crawler.run([this.config.pricingUrl]);
    if (!result) {
      throw new Error(`Failed to crawl ${this.config.pricingUrl}`);
    }
    return result;
  }
}
