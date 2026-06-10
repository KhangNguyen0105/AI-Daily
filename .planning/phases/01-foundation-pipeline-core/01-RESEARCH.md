# Phase 1: Foundation & Pipeline Core - Research

**Researched:** 2026-06-10
**Domain:** Full-stack project scaffolding, database schema design, job queue orchestration, web scraping adapter pattern
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation: a Next.js 16 App Router application with TypeScript, Drizzle ORM connected to PostgreSQL, BullMQ job orchestration backed by Redis, and a Crawlee+Playwright-based provider adapter pattern. The walking skeleton proves end-to-end capability from crawling OpenAI's pricing page through storage in PostgreSQL to display on a public page.

All tech stack decisions are locked in CLAUDE.md. The phase produces the thinnest working slice: Docker Compose brings up all services, one provider adapter (OpenAI) crawls and stores real pricing data, the BullMQ pipeline executes collect->extract->score->generate with test data, and a public landing page at localhost:3000 shows "AI Daily" branding.

The OpenAI pricing page is JavaScript-rendered (403 on plain HTTP fetch), confirming the decision to use Playwright for all pages (D-16). The page contains structured pricing data for 20+ models across multiple categories (flagship, multimodal, specialized) with input/output/cached pricing per 1M tokens.

**Primary recommendation:** Use `pnpm create next-app` for scaffolding, Drizzle Kit `push` for rapid schema iteration during Phase 1, BullMQ FlowProducer for pipeline chaining, and Crawlee PlaywrightCrawler with a single OpenAI adapter implementing crawl/extract/normalize.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Adapters use an abstract base class pattern. The base class provides default implementations for common logic (retry, logging, proxy rotation).
- **D-02:** Each adapter implements three methods: `crawl()` (fetch raw HTML/JSON), `extract()` (parse into structured data), `normalize()` (map to standard schema). These match the pipeline stages.
- **D-03:** Adapters are registered via an explicit import registry -- a central file imports and registers each adapter.
- **D-04:** The base class handles infrastructure (proxy rotation, rate limiting, retry logic, HTTP client). Each adapter provides configuration (URLs, CSS selectors, extraction rules, data mappings).
- **D-05:** Normalized relational schema with foreign keys. Core chain: `sources` -> `raw_data` -> `extractions`.
- **D-06:** Confidence scoring uses an enum column (`'verified' | 'likely' | 'low_confidence'`) on the `extractions` table.
- **D-07:** Raw evidence stored as JSONB columns: `raw_data.evidence` (full HTML/JSON response) and `extractions.raw_evidence` (extracted snippet).
- **D-08:** Standard timestamps on all tables: `created_at`, `updated_at`. The `extractions` table also has `collected_at`.
- **D-09:** Separate BullMQ queues per pipeline stage: `collect`, `extract`, `score`, `generate`.
- **D-10:** Worker-triggered chaining -- each stage's worker adds the next stage's job(s) on completion.
- **D-11:** Four distinct pipeline stages: collect, extract, score, generate.
- **D-12:** Exponential backoff with max 3 retries per job. Failed jobs go to a dead-letter queue.
- **D-13:** OpenAI is the first provider adapter.
- **D-14:** First crawl extracts core pricing data only: model name, input price per 1M tokens, output price per 1M tokens, context window.
- **D-15:** End-to-end means: crawl OpenAI pricing page -> store raw HTML -> extract pricing data -> save to PostgreSQL -> display on a minimal page.
- **D-16:** Playwright (via Crawlee) for all pages. No HTTP-first fallback in Phase 1.

### Claude's Discretion

No areas were explicitly deferred to Claude. All decisions were user-selected.

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public landing page | Browser / Client (SSG) | -- | Static generation via Next.js App Router; no dynamic data needed for Phase 1 landing |
| Pricing data display | Browser / Client (SSG) | API / Backend | SSG page reads from PostgreSQL at build time; API route serves data for future dynamic features |
| Provider crawling | API / Backend (Worker) | -- | BullMQ workers run as separate Node.js processes; crawling is server-side only |
| Data extraction (AI) | API / Backend (Worker) | -- | Vercel AI SDK runs server-side in worker process |
| Database operations | Database / Storage | API / Backend | Drizzle ORM in workers and API routes; PostgreSQL is the persistence layer |
| Job orchestration | API / Backend (Worker) | Database / Storage | BullMQ workers + Redis for queue state; pipeline chaining happens server-side |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRNT-01 | Public site is read-only -- no visitor registration or user accounts | Next.js App Router with SSG; no auth on public routes; no login prompts |
| FRNT-02 | Site is built with Next.js 16 App Router with SSG for fast page loads | Next.js 16.2.9 confirmed on npm; App Router project structure documented; SSG via static page.tsx |
| DCOL-06 | System uses provider adapter pattern -- each provider has format-specific extraction logic | Abstract base class with crawl/extract/normalize; explicit import registry; Crawlee PlaywrightCrawler |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.9 | Full-stack React framework | App Router + SSG + API Routes; locked in CLAUDE.md [VERIFIED: npm registry] |
| react | 19.x | UI library | Bundled with Next.js 16 [VERIFIED: npm registry] |
| typescript | 5.x | Type safety | Non-negotiable for data-heavy platform [VERIFIED: npm registry] |
| tailwindcss | 4.3.0 | Utility-first CSS | Fast iteration; zero-runtime [VERIFIED: npm registry] |
| drizzle-orm | 0.45.2 | TypeScript ORM | SQL-like syntax, excellent inference, Drizzle Kit migrations [VERIFIED: npm registry] |
| pg | 8.21.0 | PostgreSQL driver | Node-postgres driver for Drizzle [VERIFIED: npm registry] |
| bullmq | 5.78.0 | Distributed job queue | Retry, rate limiting, job chaining, dead-letter [VERIFIED: npm registry] |
| ioredis | 5.11.1 | Redis client | Required by BullMQ; caching [VERIFIED: npm registry] |
| crawlee | 3.17.0 | Scraping framework | PlaywrightCrawler with proxy rotation, session management, fingerprint protection [VERIFIED: npm registry] |
| playwright | 1.60.0 | Browser automation | Used by Crawlee; multi-browser support [VERIFIED: npm registry] |
| zod | 4.4.3 | Schema validation | Validates API inputs, env vars, AI extraction output [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @ai-sdk/openai | 3.0.69 | OpenAI provider for Vercel AI SDK | Extraction and generation in pipeline [VERIFIED: npm registry] |
| @ai-sdk/anthropic | 3.0.82 | Anthropic provider | Multi-provider AI support [VERIFIED: npm registry] |
| ai (Vercel AI SDK) | 6.0.199 | Unified LLM interface | generateObject() for structured extraction [VERIFIED: npm registry] |
| date-fns | 4.4.0 | Date utilities | Formatting timestamps [VERIFIED: npm registry] |
| dotenv | latest | Env var loading | .env file support [VERIFIED: npm registry] |
| drizzle-kit | 0.31.10 | Migration tool | `drizzle-kit push` and `drizzle-kit generate` [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma's Rust binary inflates Docker images; Drizzle closer to SQL for complex queries |
| BullMQ | node-cron | No persistence, retries, or monitoring; BullMQ handles multi-stage pipeline |
| Crawlee | Raw Playwright | Requires manual proxy rotation, session management, retry logic |
| pnpm | npm | npm is slower, less strict dependency resolution |

**Installation:**
```bash
pnpm add next react react-dom typescript @types/react @types/node \
  drizzle-orm pg dotenv \
  bullmq ioredis \
  crawlee playwright \
  zod @ai-sdk/openai @ai-sdk/anthropic ai \
  date-fns tailwindcss @tailwindcss/postcss

pnpm add -D drizzle-kit tsx @types/pg vitest eslint prettier
```

**Version verification:** All versions confirmed via `npm view` on 2026-06-10.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| next | npm | 8+ yrs | massive | github.com/vercel/next.js | [ASSUMED] | Approved |
| drizzle-orm | npm | 3+ yrs | high | github.com/drizzle-team/drizzle-orm | [ASSUMED] | Approved |
| bullmq | npm | 5+ yrs | high | github.com/taskforcesh/bullmq | [ASSUMED] | Approved |
| ioredis | npm | 10+ yrs | massive | github.com/redis/ioredis | [ASSUMED] | Approved |
| crawlee | npm | 3+ yrs | moderate | github.com/apify/crawlee | [ASSUMED] | Approved |
| playwright | npm | 5+ yrs | massive | github.com/microsoft/playwright | [ASSUMED] | Approved |
| zod | npm | 5+ yrs | massive | github.com/colinhacks/zod | [ASSUMED] | Approved |
| @ai-sdk/openai | npm | 2+ yrs | high | github.com/vercel/ai | [ASSUMED] | Approved |
| @ai-sdk/anthropic | npm | 2+ yrs | high | github.com/vercel/ai | [ASSUMED] | Approved |
| ai | npm | 2+ yrs | high | github.com/vercel/ai | [ASSUMED] | Approved |
| pg | npm | 12+ yrs | massive | github.com/brianc/node-postgres | [ASSUMED] | Approved |
| tailwindcss | npm | 7+ yrs | massive | github.com/tailwindlabs/tailwindcss | [ASSUMED] | Approved |
| date-fns | npm | 9+ yrs | massive | github.com/date-fns/date-fns | [ASSUMED] | Approved |
| drizzle-kit | npm | 3+ yrs | high | github.com/drizzle-team/drizzle-orm | [ASSUMED] | Approved |

*slopcheck was unavailable at research time. All packages are tagged [ASSUMED]. The planner must gate each install behind a `checkpoint:human-verify` task.*

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                           Docker Compose
                    ┌──────────────────────────────┐
                    │                                │
  Browser ────────► │  Next.js App (port 3000)      │
  (public page)     │  ├─ App Router (SSG pages)     │
                    │  ├─ API Routes (future)        │
                    │  └─ Static assets              │
                    │                                │
                    │  PostgreSQL (port 5432)         │
                    │  ├─ sources                    │
                    │  ├─ raw_data                   │
                    │  ├─ extractions                │
                    │  ├─ articles                   │
                    │  ├─ pipeline_runs              │
                    │  └─ practical_costs            │
                    │                                │
                    │  Redis (port 6379)              │
                    │  ├─ BullMQ queues              │
                    │  └─ Cache                      │
                    │                                │
                    │  BullMQ Worker Process          │
                    │  ├─ collect worker              │
                    │  ├─ extract worker              │
                    │  ├─ score worker                │
                    │  └─ generate worker             │
                    │                                │
                    │  Crawlee + Playwright           │
                    │  └─ Provider Adapters           │
                    │     └─ OpenAI Adapter           │
                    └──────────────────────────────┘
```

**Data flow for the walking skeleton:**
1. BullMQ `collect` worker enqueues a crawl job for OpenAI
2. Crawlee PlaywrightCrawler navigates to OpenAI pricing page, captures raw HTML
3. Raw HTML stored in `raw_data` table (JSONB evidence column)
4. Worker chains to `extract` queue with raw_data ID
5. Extract worker uses Vercel AI SDK `generateObject()` with Zod schema to parse pricing
6. Structured data stored in `extractions` table with confidence enum
7. Worker chains to `score` queue (Phase 1: simple pass-through scoring)
8. Worker chains to `generate` queue (Phase 1: stub -- creates a placeholder article)
9. Next.js SSG page reads from `extractions` table and renders pricing data

### Recommended Project Structure

```
ai-daily/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with "AI Daily" branding
│   ├── page.tsx                  # Public landing page (SSG)
│   └── globals.css               # Tailwind imports
├── src/
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (all tables)
│   │   ├── index.ts              # Database connection
│   │   └── seed.ts               # Test data seeder
│   ├── providers/
│   │   ├── base.ts               # Abstract ProviderAdapter base class
│   │   ├── registry.ts           # Explicit adapter import registry
│   │   └── openai/
│   │       ├── adapter.ts        # OpenAI adapter (crawl/extract/normalize)
│   │       └── config.ts         # URLs, selectors, extraction rules
│   ├── pipeline/
│   │   ├── queues.ts             # BullMQ queue definitions
│   │   ├── workers/
│   │   │   ├── collect.ts        # Collect stage worker
│   │   │   ├── extract.ts        # Extract stage worker
│   │   │   ├── score.ts          # Score stage worker
│   │   │   └── generate.ts       # Generate stage worker
│   │   └── worker-entry.ts       # Worker process entry point
│   └── lib/
│       └── utils.ts              # Shared utilities
├── drizzle/                      # Generated migrations
├── drizzle.config.ts             # Drizzle Kit config
├── docker-compose.yml            # All services
├── Dockerfile                    # Multi-stage Next.js build
├── worker.Dockerfile             # Worker process build
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.example
```

### Pattern 1: Provider Adapter Base Class

**What:** Abstract base class that each provider adapter extends. Base handles infrastructure (HTTP client, retry, logging); adapters provide configuration and extraction logic.

**When to use:** Every new provider added in Phase 2+ extends this base.

**Example:**
```typescript
// src/providers/base.ts
import { PlaywrightCrawler } from 'crawlee';

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  pricingUrl: string;
}

export interface CrawlResult {
  url: string;
  html: string;
  crawledAt: Date;
}

export interface ExtractionResult {
  modelName: string;
  inputPricePer1m: number;
  outputPricePer1m: number;
  contextWindow: number;
  confidence: 'verified' | 'likely' | 'low_confidence';
  rawEvidence: string;
}

export abstract class ProviderAdapter {
  abstract config: ProviderConfig;

  // Subclasses override to customize extraction
  abstract extract(html: string): Promise<ExtractionResult[]>;
  abstract normalize(extractions: ExtractionResult[]): ExtractionResult[];

  // Base provides default crawl implementation
  async crawl(): Promise<CrawlResult> {
    let result: CrawlResult | null = null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      async requestHandler({ page, request }) {
        const html = await page.content();
        result = {
          url: request.loadedUrl ?? request.url,
          html,
          crawledAt: new Date(),
        };
      },
    });

    await crawler.run([this.config.pricingUrl]);
    if (!result) throw new Error(`Failed to crawl ${this.config.pricingUrl}`);
    return result;
  }
}
```

### Pattern 2: Explicit Adapter Registry

**What:** A central file that imports and registers all adapters. No dynamic loading, no magic -- just imports.

**When to use:** Always. New providers are added by importing and registering in this file.

**Example:**
```typescript
// src/providers/registry.ts
import { ProviderAdapter } from './base';
import { OpenAIAdapter } from './openai/adapter';

const adapters: Map<string, ProviderAdapter> = new Map();

export function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.config.name, adapter);
}

export function getAdapter(name: string): ProviderAdapter | undefined {
  return adapters.get(name);
}

export function getAllAdapters(): ProviderAdapter[] {
  return Array.from(adapters.values());
}

// Register all adapters
registerAdapter(new OpenAIAdapter());
```

### Pattern 3: BullMQ Pipeline Chaining

**What:** Each pipeline stage is a separate queue. Workers add jobs to the next stage's queue on completion.

**When to use:** All pipeline stages. Each worker owns its handoff logic.

**Example:**
```typescript
// src/pipeline/queues.ts
import { Queue } from 'bullmq';

const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 };

export const collectQueue = new Queue('collect', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const extractQueue = new Queue('extract', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const scoreQueue = new Queue('score', { connection });
export const generateQueue = new Queue('generate', { connection });
```

```typescript
// src/pipeline/workers/collect.ts
import { Worker, Job } from 'bullmq';
import { getAdapter } from '../../providers/registry';
import { extractQueue } from '../queues';

export const collectWorker = new Worker(
  'collect',
  async (job: Job) => {
    const { providerName } = job.data;
    const adapter = getAdapter(providerName);
    if (!adapter) throw new Error(`Unknown provider: ${providerName}`);

    const crawlResult = await adapter.crawl();

    // Store raw data in DB (implementation in task)
    const rawDataId = await storeRawData(crawlResult);

    // Chain to extract stage
    await extractQueue.add('extract', {
      rawDataId,
      providerName,
    });

    return { rawDataId };
  },
  { connection: { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 } }
);
```

### Pattern 4: Drizzle Schema with JSONB and Enums

**What:** Normalized schema with foreign key chains, JSONB for evidence, and pgEnum for confidence scoring.

**When to use:** All database tables follow this pattern.

**Example:**
```typescript
// src/db/schema.ts
import {
  pgTable, serial, varchar, text, integer,
  timestamp, jsonb, pgEnum, real,
} from 'drizzle-orm/pg-core';

export const confidenceEnum = pgEnum('confidence', [
  'verified', 'likely', 'low_confidence',
]);

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  providerType: varchar('provider_type', { length: 100 }).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rawData = pgTable('raw_data', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').references(() => sources.id).notNull(),
  url: text('url').notNull(),
  evidence: jsonb('evidence').notNull(), // Full HTML/JSON response
  crawledAt: timestamp('crawled_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const extractions = pgTable('extractions', {
  id: serial('id').primaryKey(),
  rawDataId: integer('raw_data_id').references(() => rawData.id).notNull(),
  sourceId: integer('source_id').references(() => sources.id).notNull(),
  modelName: varchar('model_name', { length: 255 }).notNull(),
  inputPricePer1m: real('input_price_per_1m'),
  outputPricePer1m: real('output_price_per_1m'),
  contextWindow: integer('context_window'),
  confidence: confidenceEnum('confidence').notNull(),
  rawEvidence: jsonb('raw_evidence'), // Extracted snippet
  collectedAt: timestamp('collected_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pipelineRuns = pgTable('pipeline_runs', {
  id: serial('id').primaryKey(),
  status: varchar('status', { length: 50 }).notNull(), // 'running' | 'completed' | 'failed'
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  stats: jsonb('stats'), // { sources_attempted, succeeded, failed }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const practicalCosts = pgTable('practical_costs', {
  id: serial('id').primaryKey(),
  extractionId: integer('extraction_id').references(() => extractions.id).notNull(),
  scenarioName: varchar('scenario_name', { length: 255 }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  estimatedCost: real('estimated_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Anti-Patterns to Avoid

- **Dynamic adapter loading:** Do not use `require()` or `import()` with glob patterns to discover adapters. Use explicit imports in registry.ts. Debuggable, type-safe, no magic.
- **Shared single queue:** Do not put all pipeline stages in one queue with job type discrimination. Separate queues per stage enable independent scaling and monitoring.
- **Storing only extracted data:** Do not discard raw HTML/JSON after extraction. Store it in `raw_data.evidence` JSONB for re-extraction when extraction logic improves.
- **HTTP-first crawl with Playwright fallback:** Do not implement a two-tier crawl strategy in Phase 1. Use Playwright for everything (D-16). The OpenAI pricing page returns 403 on plain HTTP.
- **Custom retry logic:** Do not implement retry loops in worker code. BullMQ's `attempts` and `backoff` options handle this at the queue level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job retry with backoff | Custom retry loops in worker code | BullMQ `attempts` + `backoff: { type: 'exponential', delay: 1000 }` | Built-in exponential backoff, stalled job detection, dead-letter support |
| Database migrations | Manual SQL migration files | Drizzle Kit `generate` + `push` | Type-safe schema changes, automatic migration generation |
| Browser automation | Raw Playwright setup with manual proxy/session management | Crawlee PlaywrightCrawler | Built-in proxy rotation, session management, fingerprint protection, request queue |
| HTML parsing | Regex or string manipulation for pricing extraction | Vercel AI SDK `generateObject()` with Zod schema | AI-powered extraction handles page structure changes; Zod validates output shape |
| Environment variable validation | Manual `process.env` checks with ad-hoc error messages | Zod schema for env vars | Type-safe, validates at startup, clear error messages |
| Cron scheduling | node-cron or setInterval | BullMQ delayed/repeated jobs | Persistent across restarts, monitored, retry-capable |

**Key insight:** BullMQ, Crawlee, and Drizzle each solve problems that look simple but have deep edge cases (retry jitter, browser fingerprinting, migration rollbacks). Custom implementations will be buggy and unmaintainable.

## Runtime State Inventory

Not applicable -- this is a greenfield Phase 1 with no existing runtime state.

## Common Pitfalls

### Pitfall 1: BullMQ Worker Process Lifecycle

**What goes wrong:** Worker process exits immediately after starting because the script doesn't keep the event loop alive.

**Why it happens:** BullMQ workers are event-driven. If the main script completes without keeping the process alive, Node.js exits.

**How to avoid:** Workers should NOT call `await worker.close()` in the main flow. The worker stays alive as long as the process runs. Use `worker.on('error', ...)` to prevent silent crashes.

**Warning signs:** Worker starts, logs "ready", then process exits with code 0.

### Pitfall 2: Drizzle Kit Push vs Generate

**What goes wrong:** Using `drizzle-kit generate` during Phase 1 development creates migration files that must be manually applied, slowing iteration.

**Why it happens:** `generate` creates SQL migration files; `push` applies schema directly to the database.

**How to avoid:** Use `drizzle-kit push` during Phase 1 development for rapid iteration. Switch to `generate` + `migrate` when the schema stabilizes in later phases.

**Warning signs:** Developer runs `generate` but forgets `migrate`, then wonders why the schema hasn't changed.

### Pitfall 3: OpenAI Pricing Page JavaScript Rendering

**What goes wrong:** Attempting to fetch OpenAI pricing page with plain HTTP returns 403 or empty content.

**Why it happens:** The pricing page requires JavaScript rendering and has bot protection.

**How to avoid:** Use Playwright (via Crawlee) for all provider pages (D-16). Do not implement HTTP-first fallback.

**Warning signs:** Empty HTML content or 403 status codes from `page.content()`.

### Pitfall 4: Docker Compose Service Dependencies

**What goes wrong:** Next.js app starts before PostgreSQL is ready, causing connection errors.

**Why it happens:** Docker Compose starts services in parallel by default.

**How to avoid:** Use `depends_on` with `condition: service_healthy` and define healthchecks for PostgreSQL and Redis. Add retry logic in the app's database connection.

**Warning signs:** `ECONNREFUSED` errors on first `docker compose up`.

### Pitfall 5: Crawlee Storage Directory in Docker

**What goes wrong:** Crawlee writes to `./storage/` by default, which may conflict with the app's working directory in Docker.

**Why it happens:** Default `CRAWLEE_STORAGE_DIR` is `./storage/` relative to the process.

**How to avoid:** Set `CRAWLEE_STORAGE_DIR` environment variable to a dedicated path (e.g., `/tmp/crawlee-storage`) in the worker container.

**Warning signs:** Permission errors or unexpected files in the app directory.

## Code Examples

### Next.js App Router -- Root Layout with Branding

```typescript
// app/layout.tsx
// Source: https://nextjs.org/docs/app/getting-started/project-structure
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Daily - AI Model Pricing Intelligence',
  description: 'Understand what AI models actually cost in real-world usage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Next.js App Router -- Public Landing Page (SSG)

```typescript
// app/page.tsx
// Source: https://nextjs.org/docs/app/getting-started/project-structure
export default function HomePage() {
  return (
    <main>
      <h1>AI Daily</h1>
      <p>AI Model Pricing Intelligence</p>
      <p>Understand what AI models actually cost in real-world usage.</p>
    </main>
  );
}
```

### Drizzle ORM -- Connection Setup

```typescript
// src/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
  },
  schema,
});
```

### BullMQ -- Queue with Exponential Backoff

```typescript
// src/pipeline/queues.ts
// Source: https://docs.bullmq.io/guide/retrying-failing-jobs
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}

export const collectQueue = createQueue('collect');
export const extractQueue = createQueue('extract');
export const scoreQueue = createQueue('score');
export const generateQueue = createQueue('generate');
```

### BullMQ -- Worker with Error Handler

```typescript
// src/pipeline/workers/collect.ts
// Source: https://docs.bullmq.io/guide/workers
import { Worker, Job } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
};

export function createCollectWorker() {
  const worker = new Worker(
    'collect',
    async (job: Job) => {
      const { providerName } = job.data;
      // ... crawl logic
      return { rawDataId: 1 };
    },
    { connection, concurrency: 1 }
  );

  // CRITICAL: Without error handler, worker may stop processing
  worker.on('error', (err) => {
    console.error('Collect worker error:', err);
  });

  worker.on('completed', (job) => {
    console.log(`Collect job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Collect job ${job?.id} failed:`, err.message);
  });

  return worker;
}
```

### Crawlee -- PlaywrightCrawler for OpenAI

```typescript
// src/providers/openai/adapter.ts
// Source: https://crawlee.dev/docs/quick-start
import { PlaywrightCrawler } from 'crawlee';
import { ProviderAdapter, CrawlResult } from '../base';

export class OpenAIAdapter extends ProviderAdapter {
  config = {
    name: 'openai',
    baseUrl: 'https://openai.com',
    pricingUrl: 'https://developers.openai.com/api/docs/pricing',
  };

  async crawl(): Promise<CrawlResult> {
    let result: CrawlResult | null = null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      headless: true,
      async requestHandler({ page, request, log }) {
        log.info(`Crawling ${request.loadedUrl}`);
        const html = await page.content();
        result = {
          url: request.loadedUrl ?? request.url,
          html,
          crawledAt: new Date(),
        };
      },
    });

    await crawler.run([this.config.pricingUrl]);
    if (!result) throw new Error('Failed to crawl OpenAI pricing page');
    return result;
  }

  async extract(html: string): Promise<ExtractionResult[]> {
    // Uses Vercel AI SDK generateObject() with Zod schema
    // Implementation in extract worker
    return [];
  }

  normalize(extractions: ExtractionResult[]): ExtractionResult[] {
    return extractions; // OpenAI data is already in standard format
  }
}
```

### Docker Compose -- Full Stack

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aidaily
      POSTGRES_PASSWORD: aidaily_dev
      POSTGRES_DB: aidaily
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aidaily"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://aidaily:aidaily_dev@postgres:5432/aidaily
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: worker.Dockerfile
    environment:
      DATABASE_URL: postgresql://aidaily:aidaily_dev@postgres:5432/aidaily
      REDIS_HOST: redis
      REDIS_PORT: 6379
      CRAWLEE_STORAGE_DIR: /tmp/crawlee-storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
```

### Drizzle Config

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Environment Variable Validation with Zod

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (Next.js) | App Router with Server Components | Next.js 13+ (2022) | SSG/SSR via file conventions; no need for getStaticProps |
| Prisma ORM | Drizzle ORM | 2023+ | Lighter Docker images, SQL-like syntax, faster cold starts |
| Raw Playwright scraping | Crawlee framework | 2022+ | Built-in proxy rotation, session management, fingerprint protection |
| Manual LLM API calls | Vercel AI SDK | 2023+ | Unified provider interface, structured output with Zod, retry logic |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Replaced by App Router Server Components and `generateStaticParams`
- Prisma's `prisma generate` binary: Adds Rust binary to Docker images; Drizzle avoids this

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All 14 npm packages exist and are at stated versions | Standard Stack | Versions verified via `npm view` on 2026-06-10; packages exist. Risk: LOW |
| A2 | OpenAI pricing page is at developers.openai.com/api/docs/pricing | Code Examples | Verified via WebFetch redirect from platform.openai.com. Risk: LOW |
| A3 | OpenAI pricing page requires JavaScript rendering (403 on plain HTTP) | Common Pitfalls | Verified by attempting WebFetch on openai.com/api/pricing (403). Risk: LOW |
| A4 | pnpm is not installed on the target machine | Environment | Verified via `pnpm --version` (command not found). Risk: LOW -- must install or use npm |
| A5 | Drizzle Kit `push` is appropriate for Phase 1 development | Pitfalls | Based on Drizzle docs recommendation for development iteration. Risk: LOW |
| A6 | BullMQ workers keep process alive automatically | Pitfalls | Based on BullMQ docs -- workers are event-driven. Risk: LOW |
| A7 | Crawlee default storage directory is `./storage/` | Pitfalls | Based on Crawlee docs. Risk: LOW |

## Open Questions (RESOLVED)

1. **pnpm vs npm on this machine**
   - What we know: pnpm is not installed; npm 11.4.2 is available
   - What's unclear: Whether to install pnpm or use npm for Phase 1
   - RESOLVED: Install pnpm (`npm install -g pnpm`) as specified in CLAUDE.md. Docker images can use npm internally regardless. Plan 01-01 Task 1 runs `pnpm init` and `pnpm install`.

2. **Playwright browser binaries in Docker**
   - What we know: Playwright requires browser binaries (Chromium ~400MB)
   - What's unclear: Whether to use `mcr.microsoft.com/playwright` base image or install browsers manually
   - RESOLVED: Use Crawlee's built-in Playwright installation (`npx playwright install chromium --with-deps`) in the worker Dockerfile. Plan 01-03 Task 1 worker.Dockerfile includes this step.

3. **Worker as separate Dockerfile vs same image**
   - What we know: Next.js app and BullMQ worker are separate processes
   - What's unclear: Whether to use one Dockerfile with different entrypoints or two Dockerfiles
   - RESOLVED: Two Dockerfiles (Dockerfile for Next.js, worker.Dockerfile for worker). Different base requirements: Next.js needs static build output, worker needs Playwright browsers. Plan 01-01 creates Dockerfile, Plan 01-03 creates worker.Dockerfile.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | 24.15.0 | -- |
| npm | Package management | ✓ | 11.4.2 | -- |
| pnpm | Package management (CLAUDE.md) | ✗ | -- | npm (install pnpm via `npm install -g pnpm`) |
| Docker | Containerization | ✓ | 29.4.3 | -- |
| Docker Compose | Multi-container orchestration | ✓ | v5.1.3 | -- |
| Git | Version control | ✓ | 2.54.0 | -- |
| PostgreSQL | Database | ✗ (local) | -- | Docker Compose (postgres:16-alpine image) |
| Redis | Queue backend | ✗ (local) | -- | Docker Compose (redis:7-alpine image) |
| Python | Not needed | ✗ | -- | Not required for Phase 1 |

**Missing dependencies with no fallback:**
- None -- all missing dependencies have Docker Compose fallbacks

**Missing dependencies with fallback:**
- pnpm: Install via `npm install -g pnpm` or use npm as fallback
- PostgreSQL: Docker Compose provides postgres:16-alpine
- Redis: Docker Compose provides redis:7-alpine

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | None -- see Wave 0 |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm vitest run --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRNT-01 | Public page renders without login prompts | integration | `pnpm vitest run tests/landing.test.tsx` | ❌ Wave 0 |
| FRNT-02 | Next.js App Router serves SSG page | integration | `pnpm vitest run tests/landing.test.tsx` | ❌ Wave 0 |
| DCOL-06 | Provider adapter has crawl/extract/normalize methods | unit | `pnpm vitest run tests/adapter.test.ts` | ❌ Wave 0 |
| SC-01 | Docker Compose starts all services | smoke | `docker compose up -d && docker compose ps` | Manual |
| SC-02 | OpenAI adapter crawls and stores raw data | integration | `pnpm vitest run tests/openai-adapter.test.ts` | ❌ Wave 0 |
| SC-03 | BullMQ pipeline executes end-to-end | integration | `pnpm vitest run tests/pipeline.test.ts` | ❌ Wave 0 |
| SC-05 | Database schema has all core tables | unit | `pnpm vitest run tests/schema.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run`
- **Per wave merge:** `pnpm vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration
- [ ] `tests/landing.test.tsx` -- Landing page renders with branding
- [ ] `tests/adapter.test.ts` -- Provider adapter base class contract
- [ ] `tests/openai-adapter.test.ts` -- OpenAI adapter crawl/extract
- [ ] `tests/pipeline.test.ts` -- BullMQ pipeline end-to-end
- [ ] `tests/schema.test.ts` -- Database schema validation
- [ ] `tests/conftest.ts` -- Shared test fixtures (mock DB, mock Redis)
- [ ] Framework install: `pnpm add -D vitest` -- if not in package.json

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not in Phase 1 scope (admin auth is Phase 8) |
| V3 Session Management | No | Not in Phase 1 scope |
| V4 Access Control | No | Public read-only site; no access control needed |
| V5 Input Validation | Yes | Zod schema validation for env vars and API inputs |
| V6 Cryptography | No | Not in Phase 1 scope |

### Known Threat Patterns for Node.js + PostgreSQL + Redis

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | Drizzle ORM uses parameterized queries by default |
| Env var exposure | Information Disclosure | `.env` in `.gitignore`; Zod validation at startup |
| Redis unauthorized access | Elevation of Privilege | Redis in Docker network; not exposed externally in production |
| Prompt injection in AI extraction | Tampering | Zod schema validates extraction output shape; Phase 2 adds two-pass verification |

## Sources

### Primary (HIGH confidence)
- Drizzle ORM docs: https://orm.drizzle.team/docs/get-started/postgresql-new -- connection setup, schema, migrations
- Drizzle ORM column types: https://orm.drizzle.team/docs/column-types/pg -- JSONB, enum, timestamp, foreign keys
- BullMQ workers guide: https://docs.bullmq.io/guide/workers -- worker creation, error handling, TypeScript generics
- BullMQ retry guide: https://docs.bullmq.io/guide/retrying-failing-jobs -- exponential backoff, custom strategies
- BullMQ queues guide: https://docs.bullmq.io/guide/queues -- queue creation, job options, delayed jobs
- BullMQ flows guide: https://docs.bullmq.io/guide/flows -- FlowProducer, parent-child dependencies, chaining
- Crawlee quick start: https://crawlee.dev/docs/quick-start -- PlaywrightCrawler setup, Dataset storage
- Crawlee anti-blocking: https://crawlee.dev/docs/guides/avoid-blocking -- fingerprint generation, proxy setup
- Next.js project structure: https://nextjs.org/docs/app/getting-started/project-structure -- App Router conventions
- npm registry: all package versions verified via `npm view` on 2026-06-10

### Secondary (MEDIUM confidence)
- OpenAI pricing page: https://developers.openai.com/api/docs/pricing -- confirmed via redirect from platform.openai.com; structure and data points extracted

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified via npm registry; all libraries have official documentation
- Architecture: HIGH -- patterns derived from locked decisions in CONTEXT.md and verified against official docs
- Pitfalls: HIGH -- based on documented behaviors in official docs (BullMQ error handler, Drizzle push vs generate, Crawlee storage)

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (30 days -- stable stack, well-documented libraries)
