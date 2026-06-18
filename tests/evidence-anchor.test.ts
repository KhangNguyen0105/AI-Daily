import { describe, it, expect } from 'vitest';
import {
  captureEvidence,
  generateEvidenceSelector,
  validateEvidenceQuote,
  buildEvidenceQuotes,
} from '../src/lib/evidence-anchor';

// --- Fixtures ---

const sampleHtml = `
<html>
<body>
  <div class="pricing-page">
    <h1>AI Model Pricing</h1>
    <table class="pricing-table">
      <tr>
        <th>Model</th>
        <th>Input</th>
        <th>Output</th>
        <th>Context</th>
      </tr>
      <tr>
        <td>GPT-4o</td>
        <td>$2.50 per 1M tokens</td>
        <td>$10.00 per 1M tokens</td>
        <td>128k</td>
      </tr>
      <tr>
        <td>GPT-4 Turbo</td>
        <td>$10.00 per 1M tokens</td>
        <td>$30.00 per 1M tokens</td>
        <td>128k</td>
      </tr>
      <tr>
        <td>Claude 3 Opus</td>
        <td>$15.00 per 1M input tokens</td>
        <td>$75.00 per 1M output tokens</td>
        <td>200k</td>
      </tr>
    </table>
    <div class="free-tier">
      Free: up to 2 messages per day for GPT-4o
    </div>
    <p>Effective 2024-01-15</p>
    <p>Currency: USD</p>
    <p>Pricing unit: per 1M tokens</p>
  </div>
</body>
</html>
`;

const sourceUrl = 'https://openai.com/pricing';

// --- captureEvidence tests ---

describe('captureEvidence', () => {
  it('finds exact text match in HTML', () => {
    const result = captureEvidence(sampleHtml, 'model_name', 'GPT-4o', sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.evidence_quote).toBe('GPT-4o');
    expect(result!.source_url).toBe(sourceUrl);
    expect(result!.evidence_hash).toHaveLength(64); // SHA256 hex
  });

  it('finds numeric value with formatting variations', () => {
    const result = captureEvidence(sampleHtml, 'input_price', 2.5, sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.evidence_quote).toBe('2.5');
    expect(result!.extracted_text_snippet).toContain('2.5');
  });

  it('finds dollar-formatted price', () => {
    const result = captureEvidence(sampleHtml, 'input_price', '$10.00', sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.evidence_quote).toBe('$10.00');
  });

  it('returns null when value not found in HTML', () => {
    const result = captureEvidence(sampleHtml, 'input_price', 999.99, sourceUrl);
    expect(result).toBeNull();
  });

  it('returns null for empty or null values', () => {
    expect(captureEvidence(sampleHtml, 'input_price', '', sourceUrl)).toBeNull();
    expect(captureEvidence(sampleHtml, 'input_price', null as any, sourceUrl)).toBeNull();
    expect(captureEvidence(sampleHtml, 'input_price', undefined as any, sourceUrl)).toBeNull();
  });

  it('extracts context window around matched text', () => {
    const result = captureEvidence(sampleHtml, 'output_price', 10.0, sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.extracted_text_snippet.length).toBeGreaterThanOrEqual(50);
    expect(result!.extracted_text_snippet.length).toBeLessThanOrEqual(500);
  });

  it('generates CSS selector for table cells', () => {
    const result = captureEvidence(sampleHtml, 'model_name', 'GPT-4o', sourceUrl);
    expect(result).not.toBeNull();
    // Should generate some selector hint
    expect(result!.evidence_selector).toBeDefined();
  });

  it('case-insensitive matching works', () => {
    const result = captureEvidence(sampleHtml, 'model_name', 'gpt-4o', sourceUrl);
    expect(result).not.toBeNull();
  });

  it('computes SHA256 hash of evidence quote', () => {
    const result = captureEvidence(sampleHtml, 'model_name', 'GPT-4o', sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.evidence_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stores extracted_at as Date', () => {
    const result = captureEvidence(sampleHtml, 'model_name', 'GPT-4o', sourceUrl);
    expect(result).not.toBeNull();
    expect(result!.extracted_at).toBeInstanceOf(Date);
  });
});

// --- generateEvidenceSelector tests ---

describe('generateEvidenceSelector', () => {
  it('generates selector for table cell content', () => {
    const selector = generateEvidenceSelector(sampleHtml, 'GPT-4o');
    expect(selector).toBeDefined();
    expect(typeof selector).toBe('string');
  });

  it('returns undefined when target text not found', () => {
    const selector = generateEvidenceSelector(sampleHtml, 'NonExistentModel123');
    expect(selector).toBeUndefined();
  });
});

// --- validateEvidenceQuote tests ---

describe('validateEvidenceQuote', () => {
  it('returns high confidence for exact match', () => {
    const result = validateEvidenceQuote('$2.50 per 1M tokens', 2.5);
    expect(result.valid).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it('returns high confidence for numeric substring match in quote', () => {
    const result = validateEvidenceQuote('GPT-4o costs $2.50 per 1M input tokens', 2.5);
    expect(result.valid).toBe(true);
    expect(result.confidence).toBe('high'); // "2.5" is found as substring of "$2.50" in normalized text
  });

  it('returns low confidence when value not in quote', () => {
    const result = validateEvidenceQuote('$15.00 per 1M tokens', 2.5);
    expect(result.valid).toBe(false);
    expect(result.confidence).toBe('low');
  });

  it('returns low confidence for empty quote', () => {
    const result = validateEvidenceQuote('', 2.5);
    expect(result.valid).toBe(false);
    expect(result.confidence).toBe('low');
  });

  it('handles string values with exact match', () => {
    const result = validateEvidenceQuote('Model name: GPT-4o', 'GPT-4o');
    expect(result.valid).toBe(true);
    expect(result.confidence).toBe('high');
  });
});

// --- buildEvidenceQuotes tests ---

describe('buildEvidenceQuotes', () => {
  it('builds evidence quotes for all non-null fields', () => {
    const extraction = {
      modelName: 'GPT-4o',
      inputPricePer1m: 2.5,
      outputPricePer1m: 10.0,
      contextWindow: 128000,
      rawUnit: 'per 1M tokens',
      rawCurrency: 'USD',
    };
    const quotes = buildEvidenceQuotes(sampleHtml, extraction, sourceUrl);

    expect(quotes.model_name).toBeDefined();
    expect(quotes.model_name!.evidence_quote).toBe('GPT-4o');
    expect(quotes.input_price).toBeDefined();
    expect(quotes.output_price).toBeDefined();
  });

  it('skips fields with null values', () => {
    const extraction = {
      modelName: 'GPT-4o',
      inputPricePer1m: null,
      outputPricePer1m: null,
      contextWindow: null,
    };
    const quotes = buildEvidenceQuotes(sampleHtml, extraction, sourceUrl);

    expect(quotes.model_name).toBeDefined();
    expect(quotes.input_price).toBeUndefined();
    expect(quotes.output_price).toBeUndefined();
    expect(quotes.context_window).toBeUndefined();
  });

  it('sets undefined when value not found in HTML', () => {
    const extraction = {
      modelName: 'NonExistentModel',
      inputPricePer1m: 999.99,
      outputPricePer1m: null,
      contextWindow: null,
    };
    const quotes = buildEvidenceQuotes(sampleHtml, extraction, sourceUrl);

    expect(quotes.model_name).toBeUndefined();
    expect(quotes.input_price).toBeUndefined();
  });
});
