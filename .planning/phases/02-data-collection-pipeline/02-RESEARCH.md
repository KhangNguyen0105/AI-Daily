# Phase 2: Data Collection Pipeline - Research

**Researched:** 2026-06-10
**Domain:** Multi-provider AI pricing data collection, extraction, confidence scoring, and hallucination prevention
**Confidence:** HIGH

## Summary

Phase 2 extends the Phase 1 pipeline skeleton into a production-grade data collection system. The core architecture (BullMQ 4-stage pipeline, provider adapter pattern, Drizzle schema) is already built. The work centers on three areas: (1) scaling from 1 to 10+ provider adapters, each crawling official pricing pages and extracting structured data via Vercel AI SDK; (2) implementing real confidence scoring based on source tier and extraction completeness; and (3) adding two-pass verification to detect and quarantine LLM hallucinations.

The provider landscape is well-mapped. At least 12 providers have publicly accessible pricing pages with per-token pricing: OpenAI, Anthropic, Google, Mistral, Cohere, Groq, Together AI, Perplexity, xAI, Fireworks AI, DeepSeek, and Amazon Bedrock (aggregating many providers). Each has distinct page structures, requiring provider-specific extraction prompts, but the adapter pattern from Phase 1 handles this cleanly.

The key technical risk is extraction accuracy across diverse page layouts. Two-pass verification (extract twice with different prompts or models, compare results) is the standard pattern for detecting hallucinations. BullMQ's built-in cron scheduling (`repeat.pattern`) handles daily orchestration without external schedulers.

**Primary recommendation:** Build 12 provider adapters using the existing pattern, add a source tier system (Tier 1: official pricing/API docs, Tier 2: official blog/changelog, Tier 3: aggregators), implement two-pass verification in the score worker, and schedule daily runs via BullMQ repeatable jobs with cron expression `0 6 * * *` (6 AM UTC).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Provider page crawling | API / Backend (worker) | — | BullMQ workers execute Crawlee crawlers |
| HTML extraction via LLM | API / Backend (worker) | — | Vercel AI SDK generateObject in extract worker |
| Confidence scoring | API / Backend (worker) | — | Score worker computes based on source tier + completeness |
| Two-pass verification | API / Backend (worker) | — | Score worker runs second extraction pass |
| Provider config management | API / Backend (shared) | — | Static config files, loaded by registry |
| Raw data storage | Database / Storage | — | PostgreSQL rawData table with JSONB evidence |
| Extraction storage | Database / Storage | — | PostgreSQL extractions table |
| Pipeline scheduling | API / Backend (Redis) | — | BullMQ repeatable jobs in Redis |
| Pipeline stats tracking | Database / Storage | API / Backend | pipelineRuns table updated by orchestrator |

## Standard Stack

### Core (already installed from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | 5.78.0 | Job queue with repeatable jobs | Already in use; repeatable jobs for daily scheduling |
| Crawlee | 3.17.0 | Web scraping framework | Already in use; PlaywrightCrawler for JS-heavy pages |
| Playwright | 1.60.0 | Browser automation | Already in use under Crawlee |
| Vercel AI SDK | 6.0.199 | LLM structured extraction | Already in use; generateObject with Zod schemas |
| Drizzle ORM | 0.45.2 | Database access | Already in use; schema already defined |
| Zod | 4.4.3 | Schema validation | Already in use for extraction schemas |

### No New Dependencies Required
Phase 2 uses only libraries already installed in Phase 1. The work is entirely about extending existing patterns and implementing logic within the existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ repeatable jobs | node-cron | No persistence, no retry, no monitoring. BullMQ already installed. |
| Two LLM extraction passes | Statistical ensemble | More complex, higher cost. Two-pass with comparison is simpler and sufficient. |
| Per-provider extraction prompts | Single generic prompt | Generic prompts miss provider-specific layouts. Provider-specific prompts are more accurate. |

## Package Legitimacy Audit

No new packages are installed in Phase 2. All dependencies were verified in Phase 1.

| Package | Registry | Age | Downloads | Source Repo | Disposition |
|---------|----------|-----|-----------|-------------|-------------|
| (none new) | — | — | — | — | — |

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────────────┐
                        │              BullMQ Repeatable Job              │
                        │         (cron: "0 6 * * *" daily 6AM)          │
                        └─────────────────┬───────────────────────────────┘
                                          │
                                          ▼
                        ┌─────────────────────────────────────────────────┐
                        │           Pipeline Orchestrator                 │
                        │  - Creates pipelineRun record                  │
                        │  - Enqueues collect jobs for all providers      │
                        │  - Tracks stats (attempted/succeeded/failed)   │
                        └─────────────────┬───────────────────────────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                    ┌──────────┐   ┌──────────┐   ┌──────────┐
                    │ Collect  │   │ Collect  │   │ Collect  │
                    │ (OpenAI) │   │(Anthropic)│   │ (Google) │  ... x12 providers
                    └────┬─────┘   └────┬─────┘   └────┬─────┘
                         │              │              │
                         ▼              ▼              ▼
                    ┌──────────┐   ┌──────────┐   ┌──────────┐
                    │ Extract  │   │ Extract  │   │ Extract  │
                    │ Pass 1   │   │ Pass 1   │   │ Pass 1   │
                    └────┬─────┘   └────┬─────┘   └────┬─────┘
                         │              │              │
                         ▼              ▼              ▼
                    ┌──────────┐   ┌──────────┐   ┌──────────┐
                    │  Score   │   │  Score   │   │  Score   │
                    │ + Verify │   │ + Verify │   │ + Verify │
                    │ (2-pass) │   │ (2-pass) │   │ (2-pass) │
                    └────┬─────┘   └────┬─────┘   └────┬─────┘
                         │              │              │
                         └──────────────┼──────────────┘
                                        ▼
                        ┌─────────────────────────────────────────────────┐
                        │              Generate (Phase 6)                 │
                        └─────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── providers/
│   ├── base.ts                    # Abstract ProviderAdapter (exists)
│   ├── registry.ts                # Explicit adapter registry (exists)
│   ├── types.ts                   # Shared types: SourceTier, ProviderSource
│   ├── openai/
│   │   ├── adapter.ts             # (exists)
│   │   └── config.ts              # (exists)
│   ├── anthropic/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── google/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── mistral/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── cohere/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── groq/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── together/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── perplexity/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── xai/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── fireworks/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   ├── deepseek/
│   │   ├── adapter.ts             # NEW
│   │   └── config.ts              # NEW
│   └── bedrock/
│       ├── adapter.ts             # NEW (aggregated provider)
│       └── config.ts              # NEW
├── pipeline/
│   ├── queues.ts                  # (exists)
│   ├── connection.ts              # (exists)
│   ├── orchestrator.ts            # NEW: Pipeline orchestration + stats
│   ├── scheduler.ts               # NEW: BullMQ repeatable job setup
│   ├── confidence.ts              # NEW: Confidence scoring logic
│   ├── verification.ts            # NEW: Two-pass verification logic
│   └── workers/
│       ├── collect.ts             # (exists, minor updates)
│       ├── extract.ts             # (exists, minor updates)
│       ├── score.ts               # (exists, major rewrite)
│       └── generate.ts            # (exists, Phase 6 scope)
└── db/
    ├── schema.ts                  # (exists, minor additions)
    └── index.ts                   # (exists)
```

### Pattern 1: Provider Adapter with Multi-Source Config

Each provider adapter defines multiple source URLs (pricing page, docs, changelog) with source tier classification.

**What:** Extends the existing ProviderConfig to support multiple URLs per provider with tier classification.
**When to use:** Every provider adapter.
**Example:**
```typescript
// src/providers/types.ts
export type SourceTier = 'tier1' | 'tier2' | 'tier3';

export interface ProviderSource {
  url: string;
  tier: SourceTier;
  sourceType: 'pricing_page' | 'api_docs' | 'changelog' | 'blog';
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  sources: ProviderSource[];  // Multiple sources per provider
  pricingUrl: string;         // Primary pricing URL (backward compat)
}
```

### Pattern 2: Two-Pass Verification

Run extraction twice with different prompts. Compare results. Flag disagreements.

**What:** A verification pattern that detects LLM hallucinations by comparing two independent extractions.
**When to use:** Every extraction in the score worker.
**Example:**
```typescript
// src/pipeline/verification.ts
import { generateObject } from 'ai';
import { z } from 'zod';

const verificationSchema = z.object({
  models: z.array(z.object({
    modelName: z.string(),
    inputPricePer1m: z.number(),
    outputPricePer1m: z.number(),
    contextWindow: z.number(),
    supported: z.boolean().describe('Whether this data point is directly supported by the source text'),
    evidenceQuote: z.string().describe('The exact quote from the source that supports this data point'),
  })),
});

export async function verifyExtraction(
  html: string,
  pass1Results: ExtractionResult[],
  model: string,
  apiKey: string
): Promise<VerificationResult> {
  // Pass 2: Verification prompt with evidence anchoring
  const { object } = await generateObject({
    model: createOpenAI(apiKey)(model),
    schema: verificationSchema,
    prompt: `You are a verification auditor. Given the following HTML source and extracted pricing data,
verify EACH data point by finding the exact supporting quote in the source.

If a data point cannot be verified from the source text, mark supported: false.

Source HTML:
${html.slice(0, 100_000)}

Previously extracted data:
${JSON.stringify(pass1Results, null, 2)}

For each model, verify: model name, input price, output price, context window.
Return the verified data with evidence quotes.`,
  });

  // Compare pass 1 and pass 2
  const disagreements = compareResults(pass1Results, object.models);
  return {
    verified: disagreements.length === 0,
    disagreements,
    pass2Results: object.models,
  };
}
```

### Pattern 3: Pipeline Orchestrator with Stats Tracking

A central orchestrator that creates pipeline runs, enqueues all provider jobs, and tracks completion stats.

**What:** Coordinates the daily pipeline run across all providers.
**When to use:** Once per daily run, triggered by BullMQ repeatable job.
**Example:**
```typescript
// src/pipeline/orchestrator.ts
import { db } from '../db/index';
import { pipelineRuns } from '../db/schema';
import { getAllAdapters } from '../providers/registry';
import { collectQueue } from './queues';

export async function orchestrateDailyRun(): Promise<number> {
  const adapters = getAllAdapters();
  const startedAt = new Date();

  // Create pipeline run record
  const [run] = await db.insert(pipelineRuns).values({
    status: 'running',
    startedAt,
    stats: {
      totalProviders: adapters.length,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      extractions: 0,
    },
  }).returning({ id: pipelineRuns.id });

  // Enqueue collect jobs for all providers
  for (const adapter of adapters) {
    await collectQueue.add('collect', {
      providerName: adapter.config.name,
      pipelineRunId: run.id,
    }, {
      jobId: `collect-${adapter.config.name}-${Date.now()}`,
    });
  }

  return run.id;
}
```

### Pattern 4: Confidence Scoring Based on Source Tier + Completeness

```typescript
// src/pipeline/confidence.ts
import type { SourceTier } from '../providers/types';
import type { ExtractionResult } from '../providers/base';

export function calculateConfidence(
  tier: SourceTier,
  extraction: ExtractionResult,
  verificationPassed: boolean
): 'verified' | 'likely' | 'low_confidence' {
  // Tier 1 (official pricing page) + all fields present + verification passed
  if (tier === 'tier1' && hasAllFields(extraction) && verificationPassed) {
    return 'verified';
  }

  // Tier 1 + missing some fields, or Tier 2 with all fields
  if ((tier === 'tier1' && hasCoreFields(extraction)) ||
      (tier === 'tier2' && hasAllFields(extraction) && verificationPassed)) {
    return 'likely';
  }

  // Everything else
  return 'low_confidence';
}

function hasAllFields(e: ExtractionResult): boolean {
  return e.modelName != null && e.inputPricePer1m != null &&
         e.outputPricePer1m != null && e.contextWindow != null;
}

function hasCoreFields(e: ExtractionResult): boolean {
  return e.modelName != null && e.inputPricePer1m != null && e.outputPricePer1m != null;
}
```

### Anti-Patterns to Avoid

- **Single generic extraction prompt for all providers:** Each provider has different page structures. A generic prompt will miss provider-specific pricing formats (e.g., Google's tiered pricing, Cohere's hourly rates for Model Vault).
- **Storing only the latest extraction:** Historical data is needed for trend charts (Phase 7). Always insert new extractions, never update existing ones.
- **Hardcoding API keys in adapter files:** Keys come from env vars (already handled in Phase 1).
- **Running all providers sequentially:** With 12+ providers, sequential crawling would take too long. Use BullMQ concurrency to parallelize (but respect rate limits per domain).
- **Trusting first-pass extraction without verification:** LLMs hallucinate prices. Two-pass verification is mandatory for DCOL-07.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daily scheduling | Custom cron + setInterval | BullMQ repeatable jobs | Built-in persistence, deduplication, timezone support |
| HTML parsing for static pages | regex/string matching | Cheerio (already installed) | Handles malformed HTML, CSS selectors |
| Structured LLM output | Manual JSON.parse + validation | Vercel AI SDK generateObject | Zod schema validation, retry logic, provider abstraction |
| Confidence scoring | Complex ML-based scoring | Rule-based tier + completeness system | Simple, auditable, sufficient for v1 |
| Pipeline monitoring | Custom dashboard | pipelineRuns table + Bull Board (Phase 8) | Database tracks stats, Bull Board shows queue status |

## Runtime State Inventory

Not applicable — Phase 2 is a greenfield extension, not a rename/refactor.

## Common Pitfalls

### Pitfall 1: LLM Hallucinating Prices
**What goes wrong:** The LLM extracts plausible but incorrect prices (e.g., confusing input/output, inventing prices for models without pricing).
**Why it happens:** LLMs fill gaps with plausible data when the source is ambiguous or incomplete.
**How to avoid:** Two-pass verification with evidence anchoring. Pass 2 requires the LLM to cite the exact source text for each extracted field. Disagreements are quarantined.
**Warning signs:** Extraction completes instantly (no real parsing), prices are round numbers, model names don't match known models.

### Pitfall 2: Provider Page Structure Changes
**What goes wrong:** A provider redesigns their pricing page, breaking extraction.
**Why it happens:** HTML structure changes invalidate CSS selectors or confuse the LLM.
**How to avoid:** Store raw HTML in rawData table. If extraction fails or confidence drops, the raw data is available for debugging. Use provider-specific extraction prompts that reference known page elements.
**Warning signs:** Sudden drop in confidence scores for a specific provider, extraction returning empty arrays.

### Pitbull 3: Rate Limiting from Providers
**What goes wrong:** Too many requests to a provider's domain get the IP blocked.
**Why it happens:** All 12+ providers are crawled in parallel, potentially triggering rate limits.
**How to avoid:** Use Crawlee's built-in session pool and proxy configuration. Set `maxConcurrency: 1` per domain. Add delays between requests to the same domain.
**Warning signs:** HTTP 429 responses, CAPTCHA pages, empty responses.

### Pitfall 4: BullMQ Repeatable Job Duplication
**What goes wrong:** Multiple instances of the same repeatable job are created on restart.
**Why it happens:** Adding a repeatable job without a unique key creates duplicates.
**How to avoid:** Use `repeat.key` to ensure idempotency. Check `getRepeatableJobs()` before adding.
**Warning signs:** Multiple pipeline runs for the same day, doubled extraction data.

### Pitfall 5: Extraction Schema Mismatch Across Providers
**What goes wrong:** Different providers return pricing in different formats (per-token vs per-1M-token, hourly rates, per-image pricing).
**Why it happens:** The extraction schema assumes all pricing is per-1M-tokens.
**How to avoid:** Add a `priceUnit` field to the extraction schema. Normalize all prices to per-1M-tokens in the normalize() step. Document each provider's native pricing format.
**Warning signs:** Prices off by 1000x, Cohere Model Vault hourly rates stored as per-token prices.

## Code Examples

Verified patterns from official sources:

### BullMQ Repeatable Job with Cron
```typescript
// Source: https://docs.bullmq.io/guide/jobs/repeatable
import { Queue } from 'bullmq';

const dailyQueue = new Queue('daily-pipeline', { connection: redisConnection });

// Add repeatable job - runs every day at 6:00 AM UTC
await dailyQueue.add(
  'daily-collection',
  {},
  {
    repeat: {
      pattern: '0 6 * * *',  // cron: minute hour day month weekday
      key: 'daily-collection', // prevents duplicates
    },
  }
);

// List all repeatable jobs
const jobs = await dailyQueue.getRepeatableJobs();
console.log(jobs);

// Remove a repeatable job
await dailyQueue.removeRepeatable('daily-collection', { pattern: '0 6 * * *' });
```

### Vercel AI SDK generateObject with Zod
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { generateText, Output } from 'ai';
import { z } from 'zod';

const pricingSchema = z.object({
  models: z.array(z.object({
    modelName: z.string().describe('Exact model name as shown on the page'),
    inputPricePer1m: z.number().describe('Input price per 1M tokens in USD'),
    outputPricePer1m: z.number().describe('Output price per 1M tokens in USD'),
    contextWindow: z.number().describe('Context window size in tokens'),
  })),
});

const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: pricingSchema }),
  prompt: `Extract all AI model pricing data from this HTML...`,
});
```

### Crawlee PlaywrightCrawler with Concurrency Control
```typescript
// Source: https://crawlee.dev/api/playwright-crawler/class/PlaywrightCrawler
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 1,      // Only one page per provider
  maxConcurrency: 1,            // One request at a time (politeness)
  requestHandlerTimeoutSecs: 60, // 60s timeout per page
  headless: true,
  async requestHandler({ page, request }) {
    const html = await page.content();
    // ... process HTML
  },
  async failedRequestHandler({ request }) {
    console.error(`Failed to crawl ${request.url}: ${request.errorMessages}`);
  },
});

await crawler.run(['https://example.com/pricing']);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-pass extraction | Two-pass verification with evidence anchoring | Industry standard since 2024 | Prevents hallucinated prices from reaching users |
| Manual confidence labels | Rule-based scoring (source tier + completeness) | Phase 2 implementation | Automated, auditable confidence scores |
| node-cron scheduling | BullMQ repeatable jobs | Phase 1 already chose BullMQ | Persistent, retryable, monitorable daily runs |
| Generic extraction prompt | Provider-specific prompts | Phase 2 implementation | Higher accuracy across diverse page layouts |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All 12 listed providers have publicly accessible pricing pages that can be crawled without authentication | Standard Stack | Some providers may require login; would need to reduce provider count or find alternative sources |
| A2 | Vercel AI SDK generateObject works reliably with HTML input up to 100K characters | Architecture | May need to implement HTML-to-text preprocessing or chunking |
| A3 | Two-pass verification with different prompts is sufficient to detect most hallucinations | Architecture | Some systematic hallucinations may pass both passes; would need cross-provider validation |
| A4 | BullMQ repeatable jobs with `pattern: '0 6 * * *'` work correctly in Docker containers with Redis | Architecture | Timezone issues possible; may need explicit `tz` option |
| A5 | Crawlee PlaywrightCrawler can handle 12+ different provider domains without proxy rotation | Architecture | May need proxy service if IPs get blocked |

## Open Questions

1. **Which extraction model to use for verification pass?**
   - What we know: Pass 1 uses the same model as extraction (e.g., gpt-4o). Pass 2 could use the same model with a different prompt, or a different model entirely.
   - What's unclear: Whether using the same model with a different prompt provides enough diversity to catch hallucinations, or if a different model is needed.
   - Recommendation: Start with same model + different prompt (verification prompt with evidence anchoring). If hallucination rate is too high, switch pass 2 to a different model.

2. **How to handle providers with non-standard pricing (per-image, per-hour, per-second)?**
   - What we know: Cohere Model Vault charges hourly, Replicate charges per-image/second, Stability AI charges per-image.
   - What's unclear: Whether to include these in the per-1M-token comparison table or create separate categories.
   - Recommendation: Store the raw pricing with a `priceUnit` field. Normalize to per-1M-tokens where possible. Skip non-token models for the pricing table (Phase 3).

3. **Should the pipeline run all providers every day?**
   - What we know: Some providers rarely change pricing (e.g., Cohere). Others change frequently (e.g., Google, OpenAI).
   - What's unclear: Whether daily crawling of all 12+ providers is cost-effective.
   - Recommendation: Run all providers daily in v1. Add provider-specific frequency control later if LLM costs are too high.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data storage | ✓ | 16 (Docker) | — |
| Redis | BullMQ queues | ✓ | 7 (Docker) | — |
| Playwright | Web crawling | ✓ | 1.60.0 | — |
| OPENAI_API_KEY | LLM extraction | ✓ (env) | — | ANTHROPIC_API_KEY as fallback |
| Node.js | Worker runtime | ✓ | 22 (Docker) | — |

**Missing dependencies with no fallback:**
- None — all required dependencies are available from Phase 1.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x (installed in Phase 1) |
| Config file | none — see Wave 0 |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DCOL-01 | Crawls 10+ provider pricing pages daily | integration | `pnpm test -- --grep "provider crawl"` | Wave 0 |
| DCOL-02 | AI extraction converts HTML to structured records | unit | `pnpm test -- --grep "extraction"` | Wave 0 |
| DCOL-03 | Stores raw source URLs and evidence snippets | unit | `pnpm test -- --grep "raw data storage"` | Wave 0 |
| DCOL-04 | Assigns confidence scores based on source tier | unit | `pnpm test -- --grep "confidence"` | Wave 0 |
| DCOL-05 | Daily schedule via BullMQ repeatable jobs | integration | `pnpm test -- --grep "scheduler"` | Wave 0 |
| DCOL-07 | Two-pass verification quarantines disagreements | unit | `pnpm test -- --grep "verification"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest configuration file
- [ ] `tests/pipeline/orchestrator.test.ts` — Pipeline orchestration tests
- [ ] `tests/pipeline/confidence.test.ts` — Confidence scoring tests
- [ ] `tests/pipeline/verification.test.ts` — Two-pass verification tests
- [ ] `tests/providers/adapter.test.ts` — Provider adapter tests (mock crawl)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in Phase 2 scope (Phase 8) |
| V3 Session Management | no | Not in Phase 2 scope |
| V4 Access Control | no | Not in Phase 2 scope |
| V5 Input Validation | yes | Zod schemas validate all extraction output; HTML input sanitized before LLM processing |
| V6 Cryptography | no | No encryption needed for public pricing data |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LLM prompt injection via crawled HTML | Elevation of Privilege | HTML content is treated as untrusted input; extraction prompts are structured to prevent prompt injection; output validated by Zod schema |
| API key exposure in logs | Information Disclosure | API keys from env vars, never logged (already handled in Phase 1) |
| Crawled HTML containing malicious scripts | Tampering | HTML is never executed in the app context; only processed by LLM and stored as text |

## Sources

### Primary (HIGH confidence)
- BullMQ documentation: https://docs.bullmq.io/guide/jobs/repeatable — repeatable job patterns, cron syntax, deduplication
- Vercel AI SDK documentation: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data — generateObject, Output.object, Zod integration
- Crawlee documentation: https://crawlee.dev/api/playwright-crawler/class/PlaywrightCrawler — PlaywrightCrawler options
- Google AI pricing: https://ai.google.dev/pricing — Gemini model pricing (verified via fetch)
- Anthropic pricing: https://platform.claude.com/docs/en/docs/about-claude/models — Claude model pricing (verified via fetch)
- Cohere pricing: https://cohere.com/pricing — Command model pricing (verified via fetch)
- Groq pricing: https://groq.com/pricing/ — Llama/Qwen model pricing (verified via fetch)
- Together AI pricing: https://www.together.ai/pricing — Multi-model pricing (verified via fetch)
- Perplexity pricing: https://docs.perplexity.ai/guides/pricing — Sonar model pricing (verified via fetch)
- xAI pricing: https://docs.x.ai/docs/models — Grok model pricing (verified via fetch)
- Amazon Bedrock pricing: https://aws.amazon.com/bedrock/pricing/ — Multi-provider pricing (verified via fetch)

### Secondary (MEDIUM confidence)
- Fireworks AI pricing: https://fireworks.ai/pricing — Limited info, redirects to docs
- Replicate pricing: https://replicate.com/pricing — Per-model pricing shown
- DeepSeek pricing: https://platform.deepseek.com — 403 Forbidden, pricing not directly accessible

### Tertiary (LOW confidence)
- Mistral pricing: https://mistral.ai/products/la-plateforme#pricing — Certificate error, pricing not directly accessible

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in Phase 1
- Architecture: HIGH — extends proven Phase 1 patterns, well-documented BullMQ and Vercel AI SDK APIs
- Pitfalls: HIGH — common LLM extraction pitfalls are well-documented in industry literature

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (30 days — provider pricing pages change frequently but architecture patterns are stable)
