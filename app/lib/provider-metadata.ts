/**
 * Provider metadata: logo paths and display name normalization.
 * Used by PricingTable to render provider logos alongside names.
 *
 * Per PRIC-03: Provider logos next to provider names.
 * Per PRIC-04: Provider filter dropdown with unique providers.
 */

import type { PricingRow } from '@/app/components/PricingTable';

/**
 * Map of normalized provider names (lowercase) to logo file paths.
 * Includes common aliases (e.g., "google gemini" -> google logo, "aws" -> amazon logo).
 */
export const providerLogos: Record<string, string> = {
  'openai': '/logos/openai.svg',
  'anthropic': '/logos/anthropic.svg',
  'google': '/logos/google.svg',
  'google gemini': '/logos/google.svg',
  'mistral': '/logos/mistral.svg',
  'mistral ai': '/logos/mistral.svg',
  'cohere': '/logos/cohere.svg',
  'groq': '/logos/groq.svg',
  'together': '/logos/together.svg',
  'together ai': '/logos/together.svg',
  'perplexity': '/logos/perplexity.svg',
  'perplexity ai': '/logos/perplexity.svg',
  'xai': '/logos/xai.svg',
  'fireworks': '/logos/fireworks.svg',
  'fireworks ai': '/logos/fireworks.svg',
  'deepseek': '/logos/deepseek.svg',
  'amazon': '/logos/amazon.svg',
  'aws': '/logos/amazon.svg',
  'amazon bedrock': '/logos/amazon.svg',
};

/**
 * Look up the logo path for a provider by name.
 * Normalizes the name (lowercase, trim) before lookup.
 * Returns null if no logo is found for the provider.
 */
export function getProviderLogo(providerName: string): string | null {
  const normalized = providerName.toLowerCase().trim();
  return providerLogos[normalized] ?? null;
}

/**
 * Extract sorted unique provider names from a PricingRow data array.
 * Returns display-friendly names (original casing from data).
 * Useful for populating the provider filter dropdown.
 */
export function getUniqueProviders(data: PricingRow[]): string[] {
  const providers = new Set<string>();
  for (const row of data) {
    if (row.sourceName) {
      providers.add(row.sourceName);
    }
  }
  return Array.from(providers).sort((a, b) => a.localeCompare(b));
}
