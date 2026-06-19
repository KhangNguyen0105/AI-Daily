import { ProviderAdapter } from '../base';
import type { ProviderExtraction } from '../base';

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
 * @example
 * ```typescript
 * class ChatGPTConsumerAdapter extends ConsumerAdapter {
 *   config = { name: 'chatgpt-consumer', baseUrl: 'https://chatgpt.com', pricingUrl: 'https://chatgpt.com/pricing' };
 *   async extract(html: string): Promise<ProviderExtraction> {
 *     // Extract subscription plans from HTML
 *     return { models: [], promotions: [], subscriptionPlans: [...] };
 *   }
 * }
 * ```
 */
export abstract class ConsumerAdapter extends ProviderAdapter {
  // Consumer adapters do NOT override crawl() — they reuse the Playwright-based
  // crawl from ProviderAdapter. Each concrete adapter implements extract()
  // to parse subscription-specific data from the crawled HTML.
}
