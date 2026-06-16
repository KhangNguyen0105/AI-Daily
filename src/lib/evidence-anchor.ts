import { createHash } from 'crypto';

/**
 * Evidence anchoring system for extraction verification (D-08).
 *
 * Every extracted price must be anchored to a specific source snippet.
 * No price is verified unless anchored to specific source text.
 */

// Maximum HTML length to search (100KB — performance guard per T-02-09)
const MAX_HTML_SEARCH_LENGTH = 100_000;

// Context window around matched text (200-500 chars)
const CONTEXT_WINDOW_MIN = 200;
const CONTEXT_WINDOW_MAX = 500;

/**
 * Evidence anchor for a single extracted field.
 * Links the extracted value back to the exact source text.
 */
export interface EvidenceAnchor {
  source_url: string;
  extracted_text_snippet: string; // 200-500 char context window
  evidence_quote: string; // exact supporting text
  evidence_selector?: string; // CSS/XPath if available
  evidence_hash: string; // SHA256(evidence_quote)
  extracted_at: Date;
}

/**
 * Per-field evidence quotes structure.
 * Each important field gets its own evidence anchor.
 */
export interface EvidenceQuotes {
  model_name?: EvidenceAnchor;
  input_price?: EvidenceAnchor;
  output_price?: EvidenceAnchor;
  context_window?: EvidenceAnchor;
  currency?: EvidenceAnchor;
  pricing_unit?: EvidenceAnchor;
  free_tier?: EvidenceAnchor;
  effective_date?: EvidenceAnchor;
}

/**
 * Validation result for evidence quote against field value.
 */
export interface EvidenceValidation {
  valid: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

/**
 * Compute SHA256 hash of a string.
 */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Normalize text for matching: lowercase, collapse whitespace, strip punctuation.
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s ]+/g, ' ') // collapse all whitespace including &nbsp;
    .replace(/[.,;:!?()[\]{}'"<>]/g, '') // strip punctuation
    .trim();
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the position of a value in HTML text.
 * Tries exact match first, then case-insensitive, then normalized.
 *
 * @returns The index of the match, or -1 if not found.
 */
function findValueInHtml(html: string, value: string | number): number {
  const searchHtml = html.slice(0, MAX_HTML_SEARCH_LENGTH);
  const valueStr = String(value);

  // 1. Exact match
  let idx = searchHtml.indexOf(valueStr);
  if (idx !== -1) return idx;

  // 2. Case-insensitive match
  idx = searchHtml.toLowerCase().indexOf(valueStr.toLowerCase());
  if (idx !== -1) return idx;

  // 3. Normalized match (strip punctuation, collapse whitespace)
  const normalizedHtml = normalizeForMatch(searchHtml);
  const normalizedValue = normalizeForMatch(valueStr);
  idx = normalizedHtml.indexOf(normalizedValue);
  if (idx !== -1) return idx;

  // 4. Try with common formatting variations
  // e.g., "$2.50" might match "2.5" or "2.50 USD"
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const numVal = Number(value);
    // Try with dollar sign prefix
    const withDollar = `$${numVal}`;
    idx = searchHtml.indexOf(withDollar);
    if (idx !== -1) return idx;

    // Try without trailing zeros
    const trimmed = String(numVal).replace(/\.?0+$/, '');
    if (trimmed !== valueStr) {
      idx = searchHtml.indexOf(trimmed);
      if (idx !== -1) return idx;
    }
  }

  return -1;
}

/**
 * Extract a context window around a matched position in HTML.
 * Returns 200-500 characters of visible text context.
 */
function extractContextWindow(html: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - CONTEXT_WINDOW_MIN);
  const end = Math.min(html.length, matchIndex + matchLength + CONTEXT_WINDOW_MIN);

  let snippet = html.slice(start, end);

  // Strip HTML tags for readability (keep text content)
  snippet = snippet.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Trim to max length
  if (snippet.length > CONTEXT_WINDOW_MAX) {
    snippet = snippet.slice(0, CONTEXT_WINDOW_MAX);
  }

  return snippet;
}

/**
 * Generate a CSS selector hint for the matched text.
 * Attempts to find the nearest element containing the target text.
 * Returns undefined if no selector can be determined.
 */
export function generateEvidenceSelector(
  html: string,
  targetText: string,
): string | undefined {
  const searchHtml = html.slice(0, MAX_HTML_SEARCH_LENGTH);

  // Find the target text in the HTML
  const idx = findValueInHtml(searchHtml, targetText);
  if (idx === -1) return undefined;

  // Walk backwards to find the nearest opening tag
  const beforeMatch = searchHtml.slice(0, idx);
  const lastTagMatch = beforeMatch.match(/<(\w+)(?:\s[^>]*)?>(?=[^<]*$)/);

  if (lastTagMatch) {
    const tagName = lastTagMatch[1];

    // Check for common table/list patterns
    if (tagName === 'td' || tagName === 'th') {
      // Find the parent table and row
      const tableMatch = beforeMatch.match(/<table[^>]*class="([^"]*)"[^>]*>/i);
      const tableClass = tableMatch ? tableMatch[1] : '';
      const rowIdx = (beforeMatch.match(/<tr/gi) || []).length;
      const cellIdx = (beforeMatch.slice(beforeMatch.lastIndexOf('<tr')).match(/<t[dh]/gi) || []).length;
      return tableClass
        ? `table.${tableClass.split(' ')[0]} > tr:nth-child(${rowIdx}) > ${tagName}:nth-child(${cellIdx})`
        : `table > tr:nth-child(${rowIdx}) > ${tagName}:nth-child(${cellIdx})`;
    }

    if (tagName === 'li') {
      return 'ul > li';
    }

    if (tagName === 'p' || tagName === 'span' || tagName === 'div') {
      const classMatch = searchHtml.slice(Math.max(0, idx - 200), idx).match(
        new RegExp(`<${tagName}[^>]*class="([^"]*)"[^>]*>(?=[^<]*$)`, 'i')
      );
      return classMatch ? `${tagName}.${classMatch[1].split(' ')[0]}` : tagName;
    }

    return tagName;
  }

  return undefined;
}

/**
 * Capture evidence for an extracted field by searching for its value in the HTML.
 *
 * @param html - The raw HTML source
 * @param extractedField - The field name (e.g., 'input_price', 'model_name')
 * @param fieldValue - The extracted value to find evidence for
 * @param sourceUrl - The URL where the data was extracted from
 * @returns EvidenceAnchor if the value was found in HTML, null otherwise
 */
export function captureEvidence(
  html: string,
  extractedField: string,
  fieldValue: string | number,
  sourceUrl: string,
): EvidenceAnchor | null {
  if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
    return null;
  }

  const matchIndex = findValueInHtml(html, fieldValue);
  if (matchIndex === -1) {
    return null; // Value not found in HTML — cannot anchor
  }

  const valueStr = String(fieldValue);
  const snippet = extractContextWindow(html, matchIndex, valueStr.length);
  const selector = generateEvidenceSelector(html, valueStr);
  const hash = sha256(valueStr);

  return {
    source_url: sourceUrl,
    extracted_text_snippet: snippet,
    evidence_quote: valueStr,
    evidence_selector: selector,
    evidence_hash: hash,
    extracted_at: new Date(),
  };
}

/**
 * Validate that an evidence quote supports a given field value.
 *
 * @param quote - The evidence quote text
 * @param fieldValue - The extracted field value
 * @returns Validation result with confidence level
 */
export function validateEvidenceQuote(
  quote: string,
  fieldValue: string | number,
): EvidenceValidation {
  if (!quote || quote.trim().length === 0) {
    return { valid: false, confidence: 'low', reason: 'Empty evidence quote' };
  }

  const normalizedQuote = normalizeForMatch(quote);
  const normalizedValue = normalizeForMatch(String(fieldValue));

  // High confidence: exact match in quote
  if (normalizedQuote.includes(normalizedValue)) {
    return { valid: true, confidence: 'high' };
  }

  // Medium confidence: numeric value found with formatting variations
  if (typeof fieldValue === 'number' || !isNaN(Number(fieldValue))) {
    const numVal = Number(fieldValue);

    // Try with/without dollar sign
    const withDollar = `$${numVal}`;
    const withoutDollar = String(numVal);
    const trimmed = withoutDollar.replace(/\.?0+$/, '');

    if (
      quote.includes(withDollar) ||
      quote.includes(withoutDollar) ||
      quote.includes(trimmed)
    ) {
      return { valid: true, confidence: 'medium' };
    }
  }

  // Low confidence: no match found
  return {
    valid: false,
    confidence: 'low',
    reason: `Value "${fieldValue}" not found in evidence quote "${quote.slice(0, 100)}"`,
  };
}

/**
 * Build complete EvidenceQuotes for all fields in an extraction result.
 *
 * @param html - The raw HTML source
 * @param extraction - The extraction result with field values
 * @param sourceUrl - The source URL
 * @returns EvidenceQuotes with anchors for each non-null field
 */
export function buildEvidenceQuotes(
  html: string,
  extraction: {
    modelName: string;
    inputPricePer1m: number | null;
    outputPricePer1m: number | null;
    contextWindow: number | null;
    rawPriceText?: string;
    rawUnit?: string;
    rawCurrency?: string;
  },
  sourceUrl: string,
): EvidenceQuotes {
  const quotes: EvidenceQuotes = {};

  // Model name
  if (extraction.modelName) {
    quotes.model_name = captureEvidence(html, 'model_name', extraction.modelName, sourceUrl) ?? undefined;
  }

  // Input price — try raw text first (e.g., "$3 per 1M"), then numeric
  if (extraction.inputPricePer1m !== null) {
    quotes.input_price = captureEvidence(html, 'input_price', extraction.inputPricePer1m, sourceUrl) ?? undefined;
    if (!quotes.input_price && extraction.rawPriceText) {
      // Try to find the raw price text in HTML
      quotes.input_price = captureEvidence(html, 'input_price', extraction.rawPriceText, sourceUrl) ?? undefined;
    }
  }

  // Output price
  if (extraction.outputPricePer1m !== null) {
    quotes.output_price = captureEvidence(html, 'output_price', extraction.outputPricePer1m, sourceUrl) ?? undefined;
  }

  // Context window
  if (extraction.contextWindow !== null) {
    quotes.context_window = captureEvidence(html, 'context_window', extraction.contextWindow, sourceUrl) ?? undefined;
  }

  // Currency
  if (extraction.rawCurrency) {
    quotes.currency = captureEvidence(html, 'currency', extraction.rawCurrency, sourceUrl) ?? undefined;
  }

  // Pricing unit
  if (extraction.rawUnit) {
    quotes.pricing_unit = captureEvidence(html, 'pricing_unit', extraction.rawUnit, sourceUrl) ?? undefined;
  }

  return quotes;
}
