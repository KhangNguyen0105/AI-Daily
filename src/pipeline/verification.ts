import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ExtractionResult } from '../providers/base';

// --- Exported types ---

export interface VerificationModelResult {
  modelName: string;
  inputPricePer1m: number;
  outputPricePer1m: number;
  contextWindow: number;
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
  pass1Value: number;
  pass2Value: number;
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
      modelName: z.string(),
      inputPricePer1m: z.number(),
      outputPricePer1m: z.number(),
      contextWindow: z.number(),
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
          pass2Value: 0,
          pass2Supported: false,
        });
      }
      if (p1.outputPricePer1m !== null) {
        disagreements.push({
          modelName: p1.modelName,
          field: 'outputPricePer1m',
          pass1Value: p1.outputPricePer1m,
          pass2Value: 0,
          pass2Supported: false,
        });
      }
      if (p1.contextWindow !== null) {
        disagreements.push({
          modelName: p1.modelName,
          field: 'contextWindow',
          pass1Value: p1.contextWindow,
          pass2Value: 0,
          pass2Supported: false,
        });
      }
      continue;
    }

    // Compare each field
    const fields: Array<{
      name: 'inputPricePer1m' | 'outputPricePer1m' | 'contextWindow';
      pass1Value: number | null;
      pass2Value: number;
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
      if (!withinTolerance(f.pass1Value, f.pass2Value)) {
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
 * @param apiKey - OpenAI API key for the verification model
 * @returns VerificationResult with disagreements and pass2 results
 */
export async function verifyExtraction(
  html: string,
  pass1Results: ExtractionResult[],
  apiKey: string,
): Promise<VerificationResult> {
  const truncatedHtml = html.slice(0, MAX_HTML_LENGTH);

  const openai = createOpenAI({ apiKey });

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: verificationSchema,
    prompt: `You are a verification auditor. Given the following HTML source and previously extracted pricing data, verify EACH data point by finding the exact supporting quote in the source. If a data point cannot be verified from the source text, mark supported: false and set the value to the previously extracted value. Only include models that appear in the previously extracted data. Prices must be per 1M tokens in USD.

Previously extracted data:
${JSON.stringify(pass1Results, null, 2)}

HTML source:
${truncatedHtml}`,
  });

  const pass2Results: VerificationModelResult[] = object.models;
  const disagreements = compareResults(pass1Results, pass2Results);

  return {
    verified: disagreements.length === 0,
    disagreements,
    pass2Results,
  };
}
