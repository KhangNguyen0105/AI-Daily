/**
 * Source tier classification for pricing data sources.
 * Tier 1: Official pricing page (highest trust)
 * Tier 2: Official blog/changelog/API docs
 * Tier 3: Third-party aggregators (lowest trust)
 */
export type SourceTier = 'tier1' | 'tier2' | 'tier3';

/**
 * A source URL with tier classification.
 * Each provider can have multiple sources at different tiers.
 */
export interface ProviderSource {
  url: string;
  tier: SourceTier;
  sourceType: 'pricing_page' | 'api_docs' | 'changelog' | 'blog';
}
