/**
 * Shared pricing utility functions for AI Daily.
 * Used by both server components (page.tsx) and client components (PricingTable.tsx).
 * Extracted from app/page.tsx per D-01 (server/client split).
 */

/**
 * Format price per 1M tokens for display.
 * Returns "N/A" for null/undefined.
 * Uses up to 4 decimal places for values < $0.01, otherwise 2 decimal places.
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A';
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

/**
 * Format context window size for display.
 * Returns "N/A" for null/undefined.
 * Displays as K (thousands) or M (millions) with no decimals.
 */
export function formatContextWindow(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return 'N/A';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

/**
 * Sanitize display name to prevent Unicode manipulation attacks (WR-01).
 * Strips bidirectional override characters (U+202A-U+202E) and
 * bidirectional isolate characters (U+2066-U+2069).
 * Enforces a maximum length with "..." truncation.
 */
export function sanitizeDisplayName(name: string, maxLength = 100): string {
  // Strip bidirectional override characters (U+202A-U+202E, U+2066-U+2069)
  const cleaned = name.replace(/[‪-‮⁦-⁩]/g, '');
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned;
}

/**
 * Confidence badge color mapping.
 * Returns Tailwind CSS class strings for the badge component.
 */
export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'likely':
      return 'bg-yellow-100 text-yellow-800';
    case 'low_confidence':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Hardcoded exchange rate: 1 USD = 25,500 VND.
 * Per PRIC-07: v1 uses a fixed rate. Will be replaced with live rates in future.
 */
export const USD_VND_RATE = 25500;

/**
 * Convert a USD price to VND.
 * Returns null/undefined as-is (passthrough for missing data).
 */
export function convertToVND(price: number | null | undefined): number | null | undefined {
  if (price === null || price === undefined) return price;
  return price * USD_VND_RATE;
}

/**
 * Format a VND value for display.
 * Uses Vietnamese number formatting (dot as thousands separator) with dong symbol.
 * Returns "N/A" for null/undefined.
 */
export function formatVND(priceInVND: number | null | undefined): string {
  if (priceInVND === null || priceInVND === undefined) return 'N/A';
  const rounded = Math.round(priceInVND);
  return `${rounded.toLocaleString('vi-VN')} ₫`;
}

/**
 * Format a price in the specified currency.
 * Single entry point for PricingTable price rendering.
 * - 'usd': delegates to existing formatPrice()
 * - 'vnd': converts to VND then formats with formatVND()
 */
export function formatCurrencyPrice(price: number | null | undefined, currency: 'usd' | 'vnd'): string {
  if (currency === 'vnd') {
    return formatVND(convertToVND(price));
  }
  return formatPrice(price);
}

/**
 * Derive model family from model name prefix.
 * Per PRIC-02: Model family grouping for the pricing table.
 * Matches against known prefixes in priority order (more specific first).
 * Case-insensitive matching.
 */
export function getModelFamily(modelName: string): string {
  const name = modelName.toLowerCase();

  // Order matters: more specific prefixes before general ones
  if (name.startsWith('claude-3.5') || name.startsWith('claude-3.6')) return 'Claude 3.5';
  if (name.startsWith('claude-3')) return 'Claude 3';
  if (name.startsWith('claude-2')) return 'Claude 2';
  if (name.startsWith('gpt-4')) return 'GPT-4';
  if (name.startsWith('gpt-3')) return 'GPT-3';
  if (name.startsWith('gemini')) return 'Gemini';
  if (name.startsWith('mistral')) return 'Mistral';
  if (name.startsWith('llama')) return 'Llama';
  if (name.startsWith('cohere') || name.startsWith('command')) return 'Cohere';
  if (name.startsWith('deepseek')) return 'DeepSeek';
  if (name.startsWith('qwen')) return 'Qwen';

  return 'Other';
}
