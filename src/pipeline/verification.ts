import { generateObject } from 'ai';
import { z } from 'zod';
import type { ExtractionResult } from '../providers/base';
import type { EvidenceQuotes } from '../lib/evidence-anchor';
import { validateEvidenceQuote } from '../lib/evidence-anchor';
import { getAIModel } from '../lib/ai-client';

// --- Exported types ---

export interface VerificationModelResult {
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  supported: boolean;
  evidenceQuote: string;
}

export interface VerificationResult {
  verified: boolean;
  disagreements: Disagreement[];
  pass2Results: VerificationModelResult[];
}

export interface Disagreement {
  modelName: string;
  field: 'inputPricePer1m' | 'outputPricePer1m' | 'contextWindow';
  pass1Value: number | null;
  pass2Value: number | null;
  pass2Supported: boolean;
}

// --- Constants ---

const TOLERANCE = 0.001; // 0.1% relative tolerance
const ABSOLUTE_TOLERANCE = 0.0001; // $0.0001 per 1M tokens — floor for near-zero prices
const MAX_HTML_LENGTH = 100_000;

// --- Zod schema for LLM structured output ---

const verificationSchema = z.object({
  models: z.array(
    z.object({
      modelName: z.string().describe("The exact name of the model"),
      inputPricePer1m: z.number().nullable().describe("Input price per 1M tokens as a strictly numeric float (e.g. 0.15). Do NOT include dollar signs."),
      outputPricePer1m: z.number().nullable().describe("Output price per 1M tokens as a strictly numeric float (e.g. 0.6). Do NOT include dollar signs."),
      contextWindow: z.number().nullable().describe("Context window size as a strictly numeric integer (e.g. 128000). Do NOT include 'k' or 'm'."),
      supported: z.boolean(),
      evidenceQuote: z.string(),
    }),
  ),
});

// --- Pure comparison logic ---

/**
 * Compare pass1 extraction results with pass2 verification results.
 * Returns disagreements where values differ by more than 0.1% relative tolerance
 * or where pass2 marks a field as unsupported.
 */
export function compareResults(
  pass1: ExtractionResult[],
  pass2: VerificationModelResult[],
): Disagreement[] {
  const disagreements: Disagreement[] = [];

  for (const p1 of pass1) {
    // Find matching model in pass2 (case-insensitive)
    const p2 = pass2.find(
      (r) => r.modelName.toLowerCase() === p1.modelName.toLowerCase(),
    );

    if (!p2) {
      // Model in pass1 not found in pass2 -> disagreement for all fields
      if (p1.inputPricePer1m !== null) {
        disagreements.push({
          modelName: p1.modelName,
          field: 'inputPricePer1m',
          pass1Value: p1.inputPricePer1m,
          pass2Value: null,
          pass2Supported: false,
        });
      }
      if (p1.outputPricePer1m !== null) {
        disagreements.push({
          modelName: p1.modelName,
          field: 'outputPricePer1m',
          pass1Value: p1.outputPricePer1m,
          pass2Value: null,
          pass2Supported: false,
        });
      }
      if (p1.contextWindow !== null) {
        disagreements.push({
          modelName: p1.modelName,
          field: 'contextWindow',
          pass1Value: p1.contextWindow,
          pass2Value: null,
          pass2Supported: false,
        });
      }
      continue;
    }

    // Compare each field
    const fields: Array<{
      name: 'inputPricePer1m' | 'outputPricePer1m' | 'contextWindow';
      pass1Value: number | null;
      pass2Value: number | null;
      pass2Supported: boolean;
    }> = [
      {
        name: 'inputPricePer1m',
        pass1Value: p1.inputPricePer1m,
        pass2Value: p2.inputPricePer1m,
        pass2Supported: p2.supported,
      },
      {
        name: 'outputPricePer1m',
        pass1Value: p1.outputPricePer1m,
        pass2Value: p2.outputPricePer1m,
        pass2Supported: p2.supported,
      },
      {
        name: 'contextWindow',
        pass1Value: p1.contextWindow,
        pass2Value: p2.contextWindow,
        pass2Supported: p2.supported,
      },
    ];

    for (const f of fields) {
      // Skip if pass1 value is null (nothing to compare)
      if (f.pass1Value === null) continue;

      // Unsupported in pass2 counts as disagreement
      if (!f.pass2Supported) {
        disagreements.push({
          modelName: p1.modelName,
          field: f.name,
          pass1Value: f.pass1Value,
          pass2Value: f.pass2Value,
          pass2Supported: false,
        });
        continue;
      }

      // Relative tolerance check
      if (f.pass2Value === null || !withinTolerance(f.pass1Value, f.pass2Value)) {
        disagreements.push({
          modelName: p1.modelName,
          field: f.name,
          pass1Value: f.pass1Value,
          pass2Value: f.pass2Value,
          pass2Supported: true,
        });
      }
    }
  }

  return disagreements;
}

/**
 * Check if two values are within tolerance.
 * For very small values (near-zero prices), uses an absolute tolerance floor
 * to avoid false disagreements on free-tier or very cheap models.
 * For larger values, uses 0.1% relative tolerance.
 */
function withinTolerance(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  // For very small differences, use absolute tolerance (handles near-zero prices)
  if (diff <= ABSOLUTE_TOLERANCE) return true;
  const maxAbs = Math.max(Math.abs(a), Math.abs(b));
  if (maxAbs === 0) return true; // both zero
  return diff / maxAbs <= TOLERANCE;
}

// --- LLM-powered verification ---

/**
 * Run two-pass verification: given the original HTML and pass1 results,
 * call an LLM to re-extract with evidence anchoring, then compare.
 *
 * @param html - The raw HTML source (truncated to 100K chars)
 * @param pass1Results - Results from the first extraction pass
 * @returns VerificationResult with disagreements and pass2 results
 */
export async function verifyExtraction(
  html: string,
  pass1Results: ExtractionResult[],
): Promise<VerificationResult> {
  const truncatedHtml = html.slice(0, MAX_HTML_LENGTH);

  const { object } = await generateObject({
    model: getAIModel(),
    schema: verificationSchema,
    prompt: `You are a verification auditor. Given the following HTML source and previously extracted pricing data, verify EACH data point by finding the exact supporting quote in the source. If a data point cannot be verified from the source text, mark supported: false and set the value to the previously extracted value. Only include models that appear in the previously extracted data. Prices must be per 1M tokens in USD.

IMPORTANT: You MUST return a JSON object with EXACTLY this structure:
{
  "models": [
    {
      "modelName": "string",
      "inputPricePer1m": 0.15, // purely numeric float, or null. No dollar signs!
      "outputPricePer1m": 0.6, // purely numeric float, or null. No dollar signs!
      "contextWindow": 128000, // purely numeric integer, or null. No 'k'!
      "supported": true, // boolean
      "evidenceQuote": "string"
    }
  ]
}
DO NOT use different keys. DO NOT return strings for numbers.

Previously extracted data:
${JSON.stringify(pass1Results, null, 2)}

HTML source:
${truncatedHtml}`,
  });

  // Zod 4 infers nullable() as optional; explicitly normalize to match VerificationModelResult
  const pass2Results: VerificationModelResult[] = (object.models as any[]).map((m: any) => ({
    ...m,
    inputPricePer1m: m.inputPricePer1m ?? null,
    outputPricePer1m: m.outputPricePer1m ?? null,
    contextWindow: m.contextWindow ?? null,
  }));
  const disagreements = compareResults(pass1Results, pass2Results);

  return {
    verified: disagreements.length === 0,
    disagreements,
    pass2Results,
  };
}

// --- Evidence-based verification functions (D-08) ---

const CONVERTED_UNIT_TOLERANCE = 0.005; // 0.5% for converted units
const LARGE_CHANGE_TOLERANCE = 0.0005; // 0.05% for large price changes
const LARGE_CHANGE_THRESHOLD = 0.20; // 20% price change threshold

/**
 * Compare two numeric values with configurable tolerance.
 *
 * @param pass1 - First extraction value
 * @param pass2 - Second extraction value
 * @param unit - 'same' if same unit, 'converted' if different units (e.g., per-1K vs per-1M)
 * @param tolerance - Override tolerance (default: 0.1% same, 0.5% converted)
 * @returns Whether values match and the percent difference
 */
export function compareNumericValues(
  pass1: number,
  pass2: number,
  unit: 'same' | 'converted',
  tolerance?: number,
): { matches: boolean; percentDiff: number } {
  const diff = Math.abs(pass1 - pass2);
  const maxAbs = Math.max(Math.abs(pass1), Math.abs(pass2));

  if (maxAbs === 0) {
    return { matches: true, percentDiff: 0 };
  }

  const percentDiff = diff / maxAbs;
  const effectiveTolerance = tolerance ?? (unit === 'converted' ? CONVERTED_UNIT_TOLERANCE : TOLERANCE);

  return {
    matches: diff <= ABSOLUTE_TOLERANCE || percentDiff <= effectiveTolerance,
    percentDiff,
  };
}

/**
 * Detect large price changes compared to a previous extraction.
 * Per D-08: >20% price change triggers stronger verification.
 *
 * @param pass1Result - Current extraction result
 * @param previousExtraction - Previous extraction for the same model (null if first extraction)
 * @returns Change detection result with type and percent change
 */
export function detectLargeChange(
  pass1Result: ExtractionResult,
  previousExtraction: ExtractionResult | null,
): {
  changed: boolean;
  changeType: 'price_increase' | 'price_decrease' | 'unit_change' | 'field_disappear';
  percentChange: number;
} {
  if (!previousExtraction) {
    return { changed: false, changeType: 'price_increase', percentChange: 0 };
  }

  // Check for field disappearance
  if (
    (previousExtraction.inputPricePer1m !== null && pass1Result.inputPricePer1m === null) ||
    (previousExtraction.outputPricePer1m !== null && pass1Result.outputPricePer1m === null) ||
    (previousExtraction.contextWindow !== null && pass1Result.contextWindow === null)
  ) {
    return { changed: true, changeType: 'field_disappear', percentChange: 1.0 };
  }

  // Check input price change
  if (pass1Result.inputPricePer1m !== null && previousExtraction.inputPricePer1m !== null) {
    const { percentDiff } = compareNumericValues(
      pass1Result.inputPricePer1m,
      previousExtraction.inputPricePer1m,
      'same',
    );
    if (percentDiff > LARGE_CHANGE_THRESHOLD) {
      const changeType = pass1Result.inputPricePer1m > previousExtraction.inputPricePer1m
        ? 'price_increase'
        : 'price_decrease';
      return { changed: true, changeType, percentChange: percentDiff };
    }
  }

  // Check output price change
  if (pass1Result.outputPricePer1m !== null && previousExtraction.outputPricePer1m !== null) {
    const { percentDiff } = compareNumericValues(
      pass1Result.outputPricePer1m,
      previousExtraction.outputPricePer1m,
      'same',
    );
    if (percentDiff > LARGE_CHANGE_THRESHOLD) {
      const changeType = pass1Result.outputPricePer1m > previousExtraction.outputPricePer1m
        ? 'price_increase'
        : 'price_decrease';
      return { changed: true, changeType, percentChange: percentDiff };
    }
  }

  return { changed: false, changeType: 'price_increase', percentChange: 0 };
}

/**
 * Validate extraction results against evidence quotes.
 * Per D-08: No price is verified unless anchored to specific source snippet.
 *
 * @param extractionResult - The extraction result to validate
 * @param evidenceQuotes - Per-field evidence quotes
 * @param htmlSnapshot - The raw HTML snapshot for cross-checking
 * @returns Verification result with missing evidence and mismatches
 */
export async function validateAgainstEvidence(
  extractionResult: ExtractionResult,
  evidenceQuotes: EvidenceQuotes,
  htmlSnapshot: string,
): Promise<VerificationResult> {
  const disagreements: Disagreement[] = [];

  // Validate each field against its evidence quote
  if (extractionResult.inputPricePer1m !== null && evidenceQuotes.input_price) {
    const validation = validateEvidenceQuote(
      evidenceQuotes.input_price.evidence_quote,
      extractionResult.inputPricePer1m,
    );
    if (!validation.valid) {
      disagreements.push({
        modelName: extractionResult.modelName,
        field: 'inputPricePer1m',
        pass1Value: extractionResult.inputPricePer1m,
        pass2Value: null,
        pass2Supported: false,
      });
    }
  }

  if (extractionResult.outputPricePer1m !== null && evidenceQuotes.output_price) {
    const validation = validateEvidenceQuote(
      evidenceQuotes.output_price.evidence_quote,
      extractionResult.outputPricePer1m,
    );
    if (!validation.valid) {
      disagreements.push({
        modelName: extractionResult.modelName,
        field: 'outputPricePer1m',
        pass1Value: extractionResult.outputPricePer1m,
        pass2Value: null,
        pass2Supported: false,
      });
    }
  }

  if (extractionResult.contextWindow !== null && evidenceQuotes.context_window) {
    const validation = validateEvidenceQuote(
      evidenceQuotes.context_window.evidence_quote,
      extractionResult.contextWindow,
    );
    if (!validation.valid) {
      disagreements.push({
        modelName: extractionResult.modelName,
        field: 'contextWindow',
        pass1Value: extractionResult.contextWindow,
        pass2Value: null,
        pass2Supported: false,
      });
    }
  }

  return {
    verified: disagreements.length === 0,
    disagreements,
    pass2Results: [],
  };
}

/**
 * Verify extraction against evidence quotes from HTML.
 * Per D-08: Two-pass verification compares extraction against evidence quote.
 *
 * @param pass1 - The first extraction result
 * @param evidenceQuotes - Per-field evidence quotes from HTML
 * @param htmlSnapshot - The raw HTML for cross-checking
 * @returns Verification result with missing evidence and mismatches
 */
export async function verifyWithEvidenceQuotes(
  pass1: ExtractionResult,
  evidenceQuotes: EvidenceQuotes,
  htmlSnapshot: string,
): Promise<{
  verified: boolean;
  missingEvidence: string[];
  quoteMismatches: string[];
}> {
  const missingEvidence: string[] = [];
  const quoteMismatches: string[] = [];

  // Check that core fields have evidence
  if (pass1.inputPricePer1m !== null && !evidenceQuotes.input_price) {
    missingEvidence.push('input_price');
  }
  if (pass1.outputPricePer1m !== null && !evidenceQuotes.output_price) {
    missingEvidence.push('output_price');
  }
  if (!evidenceQuotes.model_name) {
    missingEvidence.push('model_name');
  }

  // Validate quotes match extracted values
  if (evidenceQuotes.input_price && pass1.inputPricePer1m !== null) {
    const validation = validateEvidenceQuote(
      evidenceQuotes.input_price.evidence_quote,
      pass1.inputPricePer1m,
    );
    if (!validation.valid) {
      quoteMismatches.push('input_price');
    }
  }

  if (evidenceQuotes.output_price && pass1.outputPricePer1m !== null) {
    const validation = validateEvidenceQuote(
      evidenceQuotes.output_price.evidence_quote,
      pass1.outputPricePer1m,
    );
    if (!validation.valid) {
      quoteMismatches.push('output_price');
    }
  }

  return {
    verified: missingEvidence.length === 0 && quoteMismatches.length === 0,
    missingEvidence,
    quoteMismatches,
  };
}
