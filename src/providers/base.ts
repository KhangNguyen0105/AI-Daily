import { PlaywrightCrawler } from 'crawlee';
import type { SourceTier, ProviderSource } from './types';

/**
 * Configuration for a provider adapter.
 * Each adapter provides its name, base URL, and pricing page URL.
 *
 * Per Wave 4: Extended with tier classification, source URLs, crawl frequency,
 * and API key configuration for Tier 1 providers.
 */
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  pricingUrl: string;
  /** Provider tier for SLA enforcement and scheduling priority */
  tier?: SourceTier;
  /** Multiple source URLs with tier classification */
  sources?: ProviderSource[];
  /** Crawl frequency in hours (Tier 1: 4, Tier 2: 12, Tier 3: 24) */
  crawlFrequencyHours?: number;
  /** Whether the provider API key is optional (some Tier 1 providers need it for /models endpoint) */
  apiKeyOptional?: boolean;
  /** Provider-specific model ID format identifier */
  modelIdFormat?: string;
  /** Currency used by this provider's pricing page */
  currency?: 'USD' | 'CNY' | 'EUR';
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
 * Evidence anchoring data for a single extracted field.
 * Per D-08: Every extracted field must include the source text snippet and selector.
 */
export interface EvidenceQuote {
  /** The exact text extracted from the source page */
  quote: string;
  /** CSS selector or path to locate the text in the HTML */
  selector?: string;
}

/**
 * Evidence bundle attached to an extraction.
 * Per D-08: Evidence anchoring required for all extractions.
 */
export interface ExtractionEvidence {
  /** The URL where the data was extracted from */
  source_url: string;
  /** A text snippet from the source page around the extraction point */
  extracted_text_snippet: string;
  /** Per-field evidence quotes mapping field name to quote */
  evidence_quotes: Record<string, EvidenceQuote>;
}

/**
 * Structured extraction of pricing data from a provider.
 * Maps to the `extractions` table in the database.
 *
 * Per Wave 4: Extended with evidence anchoring fields (D-05, D-08).
 */
export interface ExtractionResult {
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  rawEvidence: unknown;
  /** Per D-05: Raw price text before normalization */
  rawPriceText?: string;
  /** Per D-05: Raw unit string (e.g., "per 1M tokens", "per 1K tokens") */
  rawUnit?: string;
  /** Per D-05: Raw currency from source (e.g., "USD", "CNY") */
  rawCurrency?: string;
  /** Per D-05: Pricing model type classification */
  pricingModelType?: 'token_usage' | 'request_based' | 'fixed_monthly' | 'tiered' | 'free';
  /** Per D-08: Evidence anchoring data */
  evidence?: ExtractionEvidence;
  /** Per D-04: Provider-specific model ID for canonical registry matching */
  providerModelId?: string;
}

export interface PromotionResult {
  modelPattern: string;
  type: 'free_tier' | 'promotion' | 'beta';
  description: string;
  credits?: string | null;
}

export interface ProviderExtraction {
  models: ExtractionResult[];
  promotions: PromotionResult[];
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
  abstract extract(html: string): Promise<ProviderExtraction>;

  /**
   * Normalize extracted data to the standard format.
   * IN-04: Default implementation returns extractions unchanged.
   * Only adapters with provider-specific normalization (e.g., DeepSeek, Bedrock)
   * need to override this method.
   */
  normalize(extractions: ProviderExtraction): ProviderExtraction {
    return extractions;
  }

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

    await crawler.run([
      { url: this.config.pricingUrl, uniqueKey: `${this.config.pricingUrl}-${Date.now()}` }
    ]);

    if (!result) {
      throw new Error(`Failed to crawl ${this.config.name} pricing page at ${this.config.pricingUrl}`);
    }
    return result;
  }
}
