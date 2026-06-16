import { describe, it, expect } from 'vitest';
import { classifyEdgeCases, isComparableTokenPricing } from '../src/pipeline/edge-case-classifier';
import type { EdgeCaseFlags } from '../src/pipeline/edge-case-classifier';

// --- Fixtures ---

const standardExtraction = {
  modelName: 'gpt-4o',
  inputPricePer1m: 2.5,
  outputPricePer1m: 10.0,
  contextWindow: 128000,
};

const providerName = 'openai';

// --- classifyEdgeCases tests ---

describe('classifyEdgeCases', () => {
  it('returns empty flags for standard pricing HTML', async () => {
    const html = '<html><body><table><tr><td>GPT-4o</td><td>$2.50/1M</td></tr></table></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    // Should have no detected flags
    const detectedTypes = Object.entries(flags).filter(([_, v]) => v?.detected);
    expect(detectedTypes).toHaveLength(0);
  });

  it('detects free tier pricing', async () => {
    const html = '<html><body><p>Free tier: up to 100 requests per day</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.free_tier).toBeDefined();
    expect(flags.free_tier!.detected).toBe(true);
    expect(flags.free_tier!.text).toBeTruthy();
  });

  it('detects monthly plan pricing', async () => {
    const html = '<html><body><p>Pro plan: $20/month with 1M tokens included</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.monthly_plans).toBeDefined();
    expect(flags.monthly_plans!.detected).toBe(true);
    expect(flags.monthly_plans!.price).toBe('$20');
  });

  it('detects enterprise-only pricing', async () => {
    const html = '<html><body><p>Enterprise plan - contact sales for pricing</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.enterprise_only).toBeDefined();
    expect(flags.enterprise_only!.detected).toBe(true);
    expect(flags.enterprise_only!.contact_sales).toBe(true);
  });

  it('detects batch discount pricing', async () => {
    const html = '<html><body><p>Batch API: 50% off when processing 100+ requests</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.batch_discounts).toBeDefined();
    expect(flags.batch_discounts!.detected).toBe(true);
    expect(flags.batch_discounts!.discount_pct).toBe(50);
  });

  it('detects reasoning tokens', async () => {
    const html = '<html><body><p>Reasoning tokens: $15 per 1M tokens for o1 models</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.reasoning_tokens).toBeDefined();
    expect(flags.reasoning_tokens!.detected).toBe(true);
  });

  it('detects image pricing', async () => {
    const html = '<html><body><p>Image generation: $0.04 per image</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.image_audio_video_pricing).toBeDefined();
    expect(flags.image_audio_video_pricing!.detected).toBe(true);
    expect(flags.image_audio_video_pricing!.unit).toBe('image');
  });

  it('detects promotional pricing', async () => {
    const html = '<html><body><p>Limited time: 30% off all models this month</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.promotional_pricing).toBeDefined();
    expect(flags.promotional_pricing!.detected).toBe(true);
    expect(flags.promotional_pricing!.promo_text).toBeTruthy();
  });

  it('detects deprecated model', async () => {
    const html = '<html><body><p>Deprecated: GPT-3 will be sunset on 2024-12-31</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.deprecated_model).toBeDefined();
    expect(flags.deprecated_model!.detected).toBe(true);
    expect(flags.deprecated_model!.deprecation_date).toBe('2024-12-31');
  });

  it('detects contact sales pricing', async () => {
    const html = '<html><body><p>Contact sales for custom pricing</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.contact_sales_pricing).toBeDefined();
    expect(flags.contact_sales_pricing!.detected).toBe(true);
  });

  it('detects multiple edge cases simultaneously', async () => {
    const html = `
      <html><body>
        <p>Free tier: 10 requests/day</p>
        <p>Pro: $20/month with 1M tokens</p>
        <p>Batch API: 50% off for bulk processing</p>
      </body></html>
    `;
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.free_tier?.detected).toBe(true);
    expect(flags.monthly_plans?.detected).toBe(true);
    expect(flags.batch_discounts?.detected).toBe(true);
  });

  it('detects fine-tuning pricing', async () => {
    const html = '<html><body><p>Fine-tuning: $0.08 per 1M training tokens</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.fine_tuning_pricing).toBeDefined();
    expect(flags.fine_tuning_pricing!.detected).toBe(true);
  });

  it('detects embedding pricing', async () => {
    const html = '<html><body><p>Embedding models: $0.02 per 1M tokens</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.embedding_pricing).toBeDefined();
    expect(flags.embedding_pricing!.detected).toBe(true);
  });

  it('detects per-request pricing', async () => {
    const html = '<html><body><p>$0.005 per request for search queries</p></body></html>';
    const flags = await classifyEdgeCases(html, standardExtraction, providerName);

    expect(flags.per_request_pricing).toBeDefined();
    expect(flags.per_request_pricing!.detected).toBe(true);
  });
});

// --- isComparableTokenPricing tests ---

describe('isComparableTokenPricing', () => {
  it('returns true for empty flags (standard pricing)', () => {
    expect(isComparableTokenPricing({})).toBe(true);
  });

  it('returns false for free tier', () => {
    const flags: EdgeCaseFlags = {
      free_tier: { detected: true, text: 'Free tier' },
    };
    expect(isComparableTokenPricing(flags)).toBe(false);
  });

  it('returns false for monthly plans', () => {
    const flags: EdgeCaseFlags = {
      monthly_plans: { detected: true, price: '$20/month' },
    };
    expect(isComparableTokenPricing(flags)).toBe(false);
  });

  it('returns false for enterprise only', () => {
    const flags: EdgeCaseFlags = {
      enterprise_only: { detected: true, contact_sales: true },
    };
    expect(isComparableTokenPricing(flags)).toBe(false);
  });

  it('returns false for contact sales pricing', () => {
    const flags: EdgeCaseFlags = {
      contact_sales_pricing: { detected: true },
    };
    expect(isComparableTokenPricing(flags)).toBe(false);
  });

  it('returns false for per-request pricing', () => {
    const flags: EdgeCaseFlags = {
      per_request_pricing: { detected: true, rate: '$0.005' },
    };
    expect(isComparableTokenPricing(flags)).toBe(false);
  });

  it('returns true for batch discounts (still token-based)', () => {
    const flags: EdgeCaseFlags = {
      batch_discounts: { detected: true, discount_pct: 50 },
    };
    expect(isComparableTokenPricing(flags)).toBe(true);
  });

  it('returns true for cached input pricing (still token-based)', () => {
    const flags: EdgeCaseFlags = {
      cached_input_pricing: { detected: true, rate: '$0.50/1M' },
    };
    expect(isComparableTokenPricing(flags)).toBe(true);
  });

  it('returns true for reasoning tokens (still token-based)', () => {
    const flags: EdgeCaseFlags = {
      reasoning_tokens: { detected: true, rate_per_1m: '$15/1M' },
    };
    expect(isComparableTokenPricing(flags)).toBe(true);
  });
});
