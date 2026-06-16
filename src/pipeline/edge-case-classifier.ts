/**
 * Edge-case classifier for non-standard pricing detection (D-08).
 *
 * Detects and classifies pricing patterns that don't fit standard per-token models:
 * free tiers, monthly plans, enterprise-only, batch discounts, etc.
 *
 * Per D-08: Edge cases are explicitly classified and not forced into normal fields.
 */

// Maximum HTML length to scan (performance guard)
const MAX_HTML_SCAN_LENGTH = 100_000;

/**
 * Edge case flags structure.
 * Each flag indicates whether a non-standard pricing pattern was detected.
 */
export interface EdgeCaseFlags {
  free_tier?: { detected: boolean; text: string; evidence_quote?: string };
  free_trial_credits?: { detected: boolean; amount: number; currency: string };
  cached_input_pricing?: { detected: boolean; rate: string };
  batch_discounts?: { detected: boolean; discount_pct: number };
  reasoning_tokens?: { detected: boolean; rate_per_1m: string };
  image_audio_video_pricing?: { detected: boolean; unit: string };
  per_request_pricing?: { detected: boolean; rate: string };
  monthly_plans?: { detected: boolean; price: string; includes_tokens?: string };
  enterprise_only?: { detected: boolean; contact_sales: boolean };
  contact_sales_pricing?: { detected: boolean };
  region_specific_pricing?: { detected: boolean; regions: string[] };
  deprecated_model?: { detected: boolean; deprecation_date?: string };
  promotional_pricing?: { detected: boolean; promo_text: string };
  fine_tuning_pricing?: { detected: boolean; rate: string };
  embedding_pricing?: { detected: boolean; rate: string };
}

/**
 * Keyword patterns for each edge case type.
 * Each entry: [edgeCaseType, keywords[], extractionHints]
 */
const EDGE_CASE_PATTERNS: Array<{
  type: keyof EdgeCaseFlags;
  keywords: RegExp[];
  extractText?: (match: string, html: string) => Partial<EdgeCaseFlags[keyof EdgeCaseFlags]>;
}> = [
  {
    type: 'free_tier',
    keywords: [
      /\bfree\b/i,
      /\bno\s+charge\b/i,
      /\bat\s+no\s+cost\b/i,
      /\bfree\s+tier\b/i,
      /\bfree\s+usage\b/i,
    ],
  },
  {
    type: 'free_trial_credits',
    keywords: [
      /\bfree\s+(trial|credits?|tokens?)\b/i,
      /\btrial\s+credits?\b/i,
      /\$\d+\s+(free|credit|bonus)/i,
    ],
  },
  {
    type: 'cached_input_pricing',
    keywords: [
      /\bcached?\s*(input|prompt)\b/i,
      /\bcache\s*(hit|discount|pricing)\b/i,
      /\bprompt\s+caching\b/i,
    ],
  },
  {
    type: 'batch_discounts',
    keywords: [
      /\bbatch\s*(api|pricing|discount|processing)\b/i,
      /\b\d+%\s*off\s*(when|for|batch)/i,
      /\bdiscount.*batch/i,
      /\bbatch.*discount/i,
    ],
  },
  {
    type: 'reasoning_tokens',
    keywords: [
      /\breasoning\s*tokens?\b/i,
      /\bo[0-9]\b.*\btokens?\b/i,
      /\bchain\s*of\s*thought\b/i,
      /\bthinking\s*tokens?\b/i,
    ],
  },
  {
    type: 'image_audio_video_pricing',
    keywords: [
      /\bper\s+image\b/i,
      /\bper\s+second\b/i,
      /\bper\s+minute\b/i,
      /\bimage\s+(generation|pricing)\b/i,
      /\baudio\s+(input|output|pricing)\b/i,
      /\bvideo\s+(generation|pricing)\b/i,
      /\bvision\s+(model|pricing)\b/i,
    ],
  },
  {
    type: 'per_request_pricing',
    keywords: [
      /\bper\s+request\b/i,
      /\bper\s+call\b/i,
      /\bper\s+query\b/i,
      /\$\d+\.?\d*\s*(per|\/)\s*(request|call|query)/i,
    ],
  },
  {
    type: 'monthly_plans',
    keywords: [
      /\$\d+\.?\d*\s*\/?\s*month/i,
      /\bmonthly\s+(subscription|plan|price)\b/i,
      /\bper\s+month\b/i,
      /\bmonth(ly)?\s+billing\b/i,
    ],
  },
  {
    type: 'enterprise_only',
    keywords: [
      /\benterprise\s+(only|plan|pricing)\b/i,
      /\bcontact\s+(sales|us)\s+for\s+pricing\b/i,
      /\bcontact\s+us\b/i,
      /\brequest\s+(a\s+)?demo\b/i,
    ],
  },
  {
    type: 'contact_sales_pricing',
    keywords: [
      /\bcontact\s+sales\b/i,
      /\bcontact\s+us\s+for\s+pricing\b/i,
      /\bsales\s+team\b/i,
      /\bget\s+in\s+touch\b/i,
    ],
  },
  {
    type: 'region_specific_pricing',
    keywords: [
      /\bregion[- ]specific\b/i,
      /\bpricing\s+(varies|differs)\s+by\s+region\b/i,
      /\bus[- ]only\b/i,
      /\beu[- ]only\b/i,
      /\bgeo(?:graph)?(?:ical)?[- ]specific\b/i,
    ],
  },
  {
    type: 'deprecated_model',
    keywords: [
      /\bdeprecated\b/i,
      /\bsunset\b/i,
      /\bno\s+longer\s+(available|supported)\b/i,
      /\bend\s+of\s+life\b/i,
      /\bretired?\b/i,
    ],
  },
  {
    type: 'promotional_pricing',
    keywords: [
      /\blimited[- ]time\b/i,
      /\bexpires?\b/i,
      /\bpromo(?:tion(?:al)?)?\b/i,
      /\b\d+%\s*off\b/i,
      /\bspecial\s+(offer|pricing)\b/i,
    ],
  },
  {
    type: 'fine_tuning_pricing',
    keywords: [
      /\bfine[- ]tun(?:e|ing)\b/i,
      /\btraining\s+(pricing|cost|tokens?)\b/i,
      /\bcustom\s+model\s+training\b/i,
    ],
  },
  {
    type: 'embedding_pricing',
    keywords: [
      /\bembedding\s+(pricing|models?|tokens?)\b/i,
      /\bembed(?:ding)?\s+per\s+\d+[kmt]?\s*tokens?\b/i,
      /\bvector\s+embedding\b/i,
    ],
  },
];

/**
 * Extract a snippet of text around a keyword match in HTML.
 */
function extractSnippet(html: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 100);
  const end = Math.min(html.length, matchIndex + matchLength + 100);
  return html
    .slice(start, end)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify edge cases in HTML content and extraction result.
 *
 * @param htmlSnapshot - The raw HTML source (truncated to 100KB)
 * @param extraction - The extraction result to check against
 * @param providerName - The provider name for provider-specific patterns
 * @returns EdgeCaseFlags with detected patterns
 */
export async function classifyEdgeCases(
  htmlSnapshot: string,
  extraction: {
    modelName: string;
    inputPricePer1m: number | null;
    outputPricePer1m: number | null;
    contextWindow: number | null;
    rawPriceText?: string;
  },
  providerName: string,
): Promise<EdgeCaseFlags> {
  const html = htmlSnapshot.slice(0, MAX_HTML_SCAN_LENGTH);
  const flags: EdgeCaseFlags = {};

  for (const pattern of EDGE_CASE_PATTERNS) {
    for (const regex of pattern.keywords) {
      const match = html.match(regex);
      if (match) {
        const snippet = extractSnippet(html, match.index ?? 0, match[0].length);

        switch (pattern.type) {
          case 'free_tier':
            flags.free_tier = { detected: true, text: snippet, evidence_quote: match[0] };
            break;
          case 'free_trial_credits': {
            // Try to extract credit amount
            const creditMatch = snippet.match(/\$?([\d,.]+)\s*(free|credit|bonus)/i);
            flags.free_trial_credits = {
              detected: true,
              amount: creditMatch ? parseFloat(creditMatch[1].replace(/,/g, '')) : 0,
              currency: 'USD',
            };
            break;
          }
          case 'cached_input_pricing':
            flags.cached_input_pricing = { detected: true, rate: snippet };
            break;
          case 'batch_discounts': {
            const pctMatch = snippet.match(/(\d+)%/);
            flags.batch_discounts = {
              detected: true,
              discount_pct: pctMatch ? parseInt(pctMatch[1]) : 0,
            };
            break;
          }
          case 'reasoning_tokens':
            flags.reasoning_tokens = { detected: true, rate_per_1m: snippet };
            break;
          case 'image_audio_video_pricing': {
            const unitMatch = snippet.match(/per\s+(image|second|minute|frame)/i);
            flags.image_audio_video_pricing = {
              detected: true,
              unit: unitMatch ? unitMatch[1].toLowerCase() : 'unknown',
            };
            break;
          }
          case 'per_request_pricing': {
            const rateMatch = snippet.match(/\$[\d,.]+/);
            flags.per_request_pricing = {
              detected: true,
              rate: rateMatch ? rateMatch[0] : snippet,
            };
            break;
          }
          case 'monthly_plans': {
            const priceMatch = snippet.match(/\$[\d,.]+/);
            const tokenMatch = snippet.match(/(\d+[kmt]?)\s*tokens?/i);
            flags.monthly_plans = {
              detected: true,
              price: priceMatch ? priceMatch[0] : snippet,
              includes_tokens: tokenMatch ? tokenMatch[1] : undefined,
            };
            break;
          }
          case 'enterprise_only':
            flags.enterprise_only = { detected: true, contact_sales: true };
            break;
          case 'contact_sales_pricing':
            flags.contact_sales_pricing = { detected: true };
            break;
          case 'region_specific_pricing': {
            const regionMatches = snippet.match(/\b(US|EU|APAC|EMEA|[A-Z]{2})\b/g);
            flags.region_specific_pricing = {
              detected: true,
              regions: regionMatches ?? [],
            };
            break;
          }
          case 'deprecated_model': {
            const dateMatch = snippet.match(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/);
            flags.deprecated_model = {
              detected: true,
              deprecation_date: dateMatch ? dateMatch[0] : undefined,
            };
            break;
          }
          case 'promotional_pricing':
            flags.promotional_pricing = { detected: true, promo_text: snippet };
            break;
          case 'fine_tuning_pricing': {
            const ftRateMatch = snippet.match(/\$[\d,.]+/);
            flags.fine_tuning_pricing = {
              detected: true,
              rate: ftRateMatch ? ftRateMatch[0] : snippet,
            };
            break;
          }
          case 'embedding_pricing': {
            const embRateMatch = snippet.match(/\$[\d,.]+/);
            flags.embedding_pricing = {
              detected: true,
              rate: embRateMatch ? embRateMatch[0] : snippet,
            };
            break;
          }
        }

        break; // Found a match for this type, move to next
      }
    }
  }

  return flags;
}

/**
 * Determine if the extraction represents comparable token-based pricing.
 * Returns false if the extraction has edge cases that make it non-comparable.
 *
 * Used to filter Cost Calculator (only show comparable token-based pricing)
 * and in ranking (exclude non-comparable from "best price" rankings).
 *
 * @param flags - Edge case flags from classifyEdgeCases
 * @returns true if the pricing is comparable token-based pricing
 */
export function isComparableTokenPricing(flags: EdgeCaseFlags): boolean {
  // These edge cases make pricing non-comparable
  if (flags.free_tier?.detected) return false;
  if (flags.monthly_plans?.detected) return false;
  if (flags.enterprise_only?.detected) return false;
  if (flags.contact_sales_pricing?.detected) return false;
  if (flags.per_request_pricing?.detected) return false;

  return true;
}
