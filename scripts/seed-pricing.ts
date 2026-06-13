import 'dotenv/config';
import { db } from '../src/db/index';
import { sources, rawData, extractions } from '../src/db/schema';

/**
 * Seed script: populates the database with realistic AI model pricing data.
 * Run with: npx tsx scripts/seed-pricing.ts
 */

const providers = [
  { name: 'openai', url: 'https://developers.openai.com/api/docs/pricing', providerType: 'api' },
  { name: 'anthropic', url: 'https://www.anthropic.com/pricing', providerType: 'api' },
  { name: 'google', url: 'https://ai.google.dev/pricing', providerType: 'api' },
  { name: 'mistral', url: 'https://mistral.ai/technology/#pricing', providerType: 'api' },
  { name: 'deepseek', url: 'https://platform.deepseek.com/api-docs/pricing', providerType: 'api' },
  { name: 'groq', url: 'https://groq.com/pricing/', providerType: 'api' },
  { name: 'together', url: 'https://www.together.ai/pricing', providerType: 'api' },
  { name: 'perplexity', url: 'https://docs.perplexity.ai/guides/pricing', providerType: 'api' },
  { name: 'xai', url: 'https://docs.x.ai/docs/models', providerType: 'api' },
  { name: 'fireworks', url: 'https://fireworks.ai/pricing', providerType: 'api' },
  { name: 'cohere', url: 'https://cohere.com/pricing', providerType: 'api' },
  { name: 'amazon', url: 'https://aws.amazon.com/bedrock/pricing/', providerType: 'api' },
];

// Realistic pricing data (per 1M tokens, USD) — sourced from public pricing pages
const models = [
  // OpenAI
  { provider: 'openai', model: 'gpt-4o', input: 2.50, output: 10.00, ctx: 128000, confidence: 'verified' as const },
  { provider: 'openai', model: 'gpt-4o-mini', input: 0.15, output: 0.60, ctx: 128000, confidence: 'verified' as const },
  { provider: 'openai', model: 'gpt-4.1', input: 2.00, output: 8.00, ctx: 1048576, confidence: 'verified' as const },
  { provider: 'openai', model: 'gpt-4.1-mini', input: 0.40, output: 1.60, ctx: 1048576, confidence: 'verified' as const },
  { provider: 'openai', model: 'gpt-4.1-nano', input: 0.10, output: 0.40, ctx: 1048576, confidence: 'verified' as const },
  { provider: 'openai', model: 'o3', input: 2.00, output: 8.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'openai', model: 'o3-mini', input: 1.10, output: 4.40, ctx: 200000, confidence: 'verified' as const },
  { provider: 'openai', model: 'o4-mini', input: 1.10, output: 4.40, ctx: 200000, confidence: 'verified' as const },

  // Anthropic
  { provider: 'anthropic', model: 'claude-opus-4', input: 15.00, output: 75.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'anthropic', model: 'claude-sonnet-4', input: 3.00, output: 15.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'anthropic', model: 'claude-3.5-sonnet', input: 3.00, output: 15.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'anthropic', model: 'claude-3.5-haiku', input: 0.80, output: 4.00, ctx: 200000, confidence: 'verified' as const },

  // Google
  { provider: 'google', model: 'gemini-2.5-pro', input: 1.25, output: 10.00, ctx: 1048576, confidence: 'verified' as const },
  { provider: 'google', model: 'gemini-2.5-flash', input: 0.15, output: 0.60, ctx: 1048576, confidence: 'verified' as const },
  { provider: 'google', model: 'gemini-2.0-flash', input: 0.10, output: 0.40, ctx: 1048576, confidence: 'verified' as const },

  // Mistral
  { provider: 'mistral', model: 'mistral-large-latest', input: 2.00, output: 6.00, ctx: 128000, confidence: 'verified' as const },
  { provider: 'mistral', model: 'mistral-small-latest', input: 0.10, output: 0.30, ctx: 128000, confidence: 'verified' as const },
  { provider: 'mistral', model: 'codestral-latest', input: 0.30, output: 0.90, ctx: 256000, confidence: 'verified' as const },

  // DeepSeek
  { provider: 'deepseek', model: 'deepseek-chat', input: 0.27, output: 1.10, ctx: 131072, confidence: 'verified' as const },
  { provider: 'deepseek', model: 'deepseek-reasoner', input: 0.55, output: 2.19, ctx: 131072, confidence: 'verified' as const },

  // Groq
  { provider: 'groq', model: 'llama-3.3-70b', input: 0.59, output: 0.79, ctx: 131072, confidence: 'verified' as const },
  { provider: 'groq', model: 'llama-3.1-8b', input: 0.05, output: 0.08, ctx: 131072, confidence: 'verified' as const },

  // Together
  { provider: 'together', model: 'meta-llama/Llama-3.3-70B', input: 0.88, output: 0.88, ctx: 131072, confidence: 'verified' as const },
  { provider: 'together', model: 'Qwen/Qwen3-235B-A22B', input: 0.65, output: 3.00, ctx: 131072, confidence: 'verified' as const },

  // Perplexity
  { provider: 'perplexity', model: 'sonar-pro', input: 3.00, output: 15.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'perplexity', model: 'sonar', input: 1.00, output: 1.00, ctx: 128000, confidence: 'verified' as const },

  // xAI
  { provider: 'xai', model: 'grok-3', input: 3.00, output: 15.00, ctx: 131072, confidence: 'verified' as const },
  { provider: 'xai', model: 'grok-3-mini', input: 0.30, output: 0.50, ctx: 131072, confidence: 'verified' as const },

  // Fireworks
  { provider: 'fireworks', model: 'accounts/fireworks/models/llama-v3p3-70b', input: 0.90, output: 0.90, ctx: 131072, confidence: 'verified' as const },
  { provider: 'fireworks', model: 'accounts/fireworks/models/deepseek-v3', input: 0.90, output: 0.90, ctx: 131072, confidence: 'verified' as const },

  // Cohere
  { provider: 'cohere', model: 'command-r-plus', input: 2.50, output: 10.00, ctx: 128000, confidence: 'verified' as const },
  { provider: 'cohere', model: 'command-r', input: 0.15, output: 0.60, ctx: 128000, confidence: 'verified' as const },

  // Amazon Bedrock
  { provider: 'amazon', model: 'anthropic.claude-sonnet-4', input: 3.00, output: 15.00, ctx: 200000, confidence: 'verified' as const },
  { provider: 'amazon', model: 'anthropic.claude-haiku', input: 0.25, output: 1.25, ctx: 200000, confidence: 'verified' as const },
];

async function seed() {
  console.log('Seeding pricing data...');

  // 1. Insert sources
  for (const p of providers) {
    await db.insert(sources).values(p).onConflictDoNothing();
  }
  console.log(`✓ ${providers.length} providers inserted`);

  // Get source IDs
  const allSources = await db.select().from(sources);
  const sourceMap = new Map(allSources.map(s => [s.name, s.id]));

  // 2. Insert a raw_data record per provider (required for foreign key)
  const now = new Date();
  for (const p of providers) {
    const sourceId = sourceMap.get(p.name)!;
    await db.insert(rawData).values({
      sourceId,
      url: p.url,
      evidence: { html: '<seed-data/>', seeded: true },
      crawledAt: now,
    });
  }
  console.log(`✓ ${providers.length} raw_data records inserted`);

  // Get raw_data IDs
  const allRaw = await db.select().from(rawData);
  const rawMap = new Map(allRaw.map(r => [r.sourceId, r.id]));

  // 3. Insert extractions
  for (const m of models) {
    const sourceId = sourceMap.get(m.provider)!;
    const rawDataId = rawMap.get(sourceId)!;
    await db.insert(extractions).values({
      rawDataId,
      sourceId,
      modelName: m.model,
      inputPricePer1m: m.input,
      outputPricePer1m: m.output,
      contextWindow: m.ctx,
      confidence: m.confidence,
      rawEvidence: { seeded: true },
      collectedAt: now,
    });
  }
  console.log(`✓ ${models.length} model extractions inserted`);
  console.log('Done! Restart the dev server to see pricing data.');
}

seed().catch(console.error);
