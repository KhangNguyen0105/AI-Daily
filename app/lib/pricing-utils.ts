/**
 * Shared pricing utility functions for AI Daily.
 * Used by both server components (page.tsx) and client components (PricingTable.tsx).
 * Extracted from app/page.tsx per D-01 (server/client split).
 */

import type { PricingRow } from '@/app/components/PricingTable';

/**
 * Format price per 1M tokens for display.
 * Returns "N/A" for null/undefined.
 * Uses up to 4 decimal places for values < $0.01, otherwise 2 decimal places.
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return 'N/A';
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
 * Strips bidirectional override characters (U+202A-U+202E),
 * bidirectional isolate characters (U+2066-U+2069),
 * zero-width characters (U+200B-U+200D, U+FEFF),
 * other format characters (U+00AD, U+034F, U+061C, U+180E),
 * tag characters (U+E0001-U+E007F),
 * and excessive combining marks (3+ consecutive).
 * Enforces a maximum length with "..." truncation.
 */
export function sanitizeDisplayName(name: string, maxLength = 100): string {
  const cleaned = name
    .replace(/[‪-‮⁦-⁩]/g, '')    // bidi overrides + isolates
    .replace(/[​-‍﻿]/g, '')            // zero-width characters
    .replace(/[­͏؜᠎]/g, '')       // other format chars
    .replace(/[\u{E0001}-\u{E007F}]/gu, '')           // tag characters
    .replace(/[̀-ͯ]{3,}/g, '');             // excessive combining marks (3+)
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
 * Used as fallback when dynamic rate is unavailable.
 * Per PRIC-07: Dynamic rate fetched daily via exchange-rate-worker.
 */
export const USD_VND_RATE = 25500;

/**
 * Convert a USD price to VND.
 * Returns null for null/undefined inputs (collapses undefined to null).
 * @param price - USD price to convert
 * @param rate - Exchange rate (optional, defaults to USD_VND_RATE)
 */
export function convertToVND(price: number | null | undefined, rate?: number): number | null {
  if (price === null || price === undefined) return null;
  return price * (rate ?? USD_VND_RATE);
}

/**
 * Format a VND value for display.
 * Uses Vietnamese number formatting (dot as thousands separator) with dong symbol.
 * Returns "N/A" for null/undefined.
 */
export function formatVND(priceInVND: number | null | undefined): string {
  if (priceInVND === null || priceInVND === undefined || Number.isNaN(priceInVND)) return 'N/A';
  const rounded = Math.round(priceInVND);
  return `${rounded.toLocaleString('vi-VN')} ₫`;
}

/**
 * Format a price in the specified currency.
 * Single entry point for PricingTable price rendering.
 * - 'usd': delegates to existing formatPrice()
 * - 'vnd': converts to VND then formats with formatVND()
 * @param price - Price in USD
 * @param currency - Target currency
 * @param rate - Exchange rate (optional, defaults to USD_VND_RATE)
 */
export function formatCurrencyPrice(price: number | null | undefined, currency: 'usd' | 'vnd', rate?: number): string {
  if (currency === 'vnd') {
    return formatVND(convertToVND(price, rate));
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

/**
 * Result of a practical cost calculation for a single model.
 * Breaks down total cost into input and output components.
 */
export interface PracticalCost {
  modelId: number;
  modelName: string;
  sourceName: string | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  inputPricePer1m: number;
  outputPricePer1m: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Calculate the practical cost of using a model for a specific token workload.
 * Returns null if the model has missing pricing data (input or output price is null).
 *
 * @param model - PricingRow with per-1M-token prices
 * @param inputTokens - Total input tokens for the scenario
 * @param outputTokens - Total output tokens for the scenario
 */
export function calculatePracticalCost(
  model: PricingRow,
  inputTokens: number,
  outputTokens: number,
): PracticalCost | null {
  if (model.inputPricePer1m === null || model.outputPricePer1m === null) {
    return null;
  }

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1m;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePer1m;

  return {
    modelId: model.id,
    modelName: model.modelName,
    sourceName: model.sourceName,
    confidence: model.confidence,
    inputPricePer1m: model.inputPricePer1m,
    outputPricePer1m: model.outputPricePer1m,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Calculate practical costs for all models with valid pricing.
 * Filters out models with null pricing, sorts by totalCost ascending (cheapest first).
 *
 * @param models - Array of PricingRow objects
 * @param inputTokens - Total input tokens for the scenario
 * @param outputTokens - Total output tokens for the scenario
 */
export function calculateScenarioCosts(
  models: PricingRow[],
  inputTokens: number,
  outputTokens: number,
): PracticalCost[] {
  return models
    .map((model) => calculatePracticalCost(model, inputTokens, outputTokens))
    .filter((result): result is PracticalCost => result !== null)
    .sort((a, b) => a.totalCost - b.totalCost);
}
