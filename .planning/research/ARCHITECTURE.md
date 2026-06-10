# Architecture Patterns

**Domain:** Automated daily intelligence pipeline — data collection, AI extraction, content generation, publishing
**Researched:** 2026-06-10

## Recommended Architecture

A **layered pipeline** with a **job queue orchestrator** at its center. The system is split into two major runtime domains: the **pipeline runtime** (daily batch jobs) and the **application runtime** (Next.js serving the admin dashboard and public frontend). They share a PostgreSQL database and a Redis instance.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DAILY PIPELINE TRIGGER                       │
│                     (cron / node-cron / external)                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ triggers
                               v
┌─────────────────────────────────────────────────────────────────────┐
│                     JOB QUEUE ORCHESTRATOR                          │
│                        (BullMQ + Redis)                             │
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌─────────────┐  │
│  │  COLLECT  │──>│   EXTRACT    │──>│  SCORE   │──>│   GENERATE  │  │
│  │  Stage    │   │   Stage      │   │  Stage   │   │   Stage     │  │
│  └──────────┘   └──────────────┘   └──────────┘   └─────────────┘  │
│       │               │                 │               │           │
│       v               v                 v               v           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    POSTGRESQL                                │   │
│  │  sources | raw_data | extractions | scores | articles        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                            │
│                                                                     │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌──────────────┐  │
│  │   PUBLIC FRONTEND   │  │  ADMIN DASHBOARD   │  │  API ROUTES  │  │
│  │  (articles, charts, │  │  (monitor, edit,   │  │  (cron hook, │  │
│  │   comparisons)      │  │   rollback)        │  │   triggers)  │  │
│  └─────────────────────┘  └────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Why BullMQ Over Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **BullMQ + Redis** | Job dependencies (Flow), retries, rate limiting, progress tracking, mature | Requires Redis instance | **RECOMMENDED** |
| node-cron alone | Simple, no extra infra | No retries, no dependencies, no progress tracking, no parallelism control | Too simple for 30+ sources |
| Inngest / Trigger.dev | Managed, nice DX | External dependency, cost at scale, vendor lock-in | Overkill for daily batch |
| Custom setTimeout chain | Zero dependencies | Fragile, no monitoring, reinventing the wheel | Not viable |

BullMQ's **FlowProducer** is the key feature — it lets you define parent-child job relationships so the pipeline stages execute in order with proper dependency tracking.

## Component Boundaries

| Component | Responsibility | Inputs | Outputs | Communicates With |
|-----------|---------------|--------|---------|-------------------|
| **Pipeline Trigger** | Initiates daily run at scheduled time | Cron schedule | Pipeline job | BullMQ queue |
| **Source Crawlers** | Fetch raw content from 30+ provider URLs | Source URL list from DB | Raw HTML/JSON/text | PostgreSQL (raw_data table) |
| **AI Extraction Engine** | Parse raw data into structured pricing/promo/update records | Raw data snippets | Structured extractions | PostgreSQL (extractions table), AI provider API |
| **Confidence Scorer** | Assign verified/likely/low-confidence scores | Extractions + source metadata | Scored records | PostgreSQL (extractions table) |
| **Article Generator** | Create daily article from scored extractions | Scored extractions | Article markdown + metadata | PostgreSQL (articles table), AI provider API |
| **Comparison Table Builder** | Build pricing comparison tables from extractions | Scored extractions | Table data structures | PostgreSQL (comparison_data) |
| **Trend Chart Data** | Aggregate historical pricing into chart-ready time series | Historical extractions | Chart data points | PostgreSQL (trend_data) |
| **Admin Dashboard** | Monitor pipeline runs, edit/rollback content | All tables | Admin actions | PostgreSQL (all tables) |
| **Public Frontend** | Serve articles, tables, charts to visitors | Published articles, comparison data, trend data | HTML pages | PostgreSQL (read-only queries) |
| **API Routes** | Expose cron trigger endpoint, admin mutations | HTTP requests | Job enqueues, DB mutations | BullMQ, PostgreSQL |

## Data Flow

### Daily Pipeline Flow (left to right, top to bottom)

```
Phase 1: COLLECT
  Source URL config (DB) ──> Source Crawlers ──> Raw content (HTML/JSON)
  Fan-out: 30+ crawlers run in parallel (BullMQ concurrency)
  Each crawler: fetch URL, capture raw response, store with timestamp

Phase 2: EXTRACT
  Raw content ──> AI Extraction Engine ──> Structured records
  For each raw_data row:
    - Send to AI provider with extraction prompt
    - Parse response into: provider, model, pricing, promo, free_tier, update_type
    - Store structured extraction linked to raw_data

Phase 3: SCORE
  Structured extractions ──> Confidence Scorer ──> Scored records
  Scoring factors:
    - Source tier (official pricing page = high, community = low)
    - Extraction completeness (all fields present = higher score)
    - Cross-reference (same data from multiple sources = higher score)
    - Recency (data freshness)

Phase 4: GENERATE
  Scored extractions ──> Article Generator ──> Daily article
  Scored extractions ──> Comparison Table Builder ──> Table data
  Historical extractions ──> Trend Chart Data ──> Chart data points
  (These three run in parallel — no dependencies between them)

Phase 5: PUBLISH
  Generated content ──> Mark as "published" in DB
  Public frontend serves published content automatically (no build step)
```

### Data Flow Diagram

```
                    ┌─────────────┐
                    │  SOURCE URL  │
                    │  CONFIG (DB) │
                    └──────┬──────┘
                           │
                    ┌──────v──────┐
                    │  CRAWLERS   │ 30+ parallel workers
                    │  (fetch)    │
                    └──────┬──────┘
                           │ raw HTML/JSON
                    ┌──────v──────┐
                    │   RAW DATA  │ stored in PostgreSQL
                    │   TABLE     │
                    └──────┬──────┘
                           │
                    ┌──────v──────┐
                    │  AI EXTRACT │ LLM-powered parsing
                    │  ENGINE     │
                    └──────┬──────┘
                           │ structured records
                    ┌──────v──────┐
                    │ CONFIDENCE  │ rule-based + source tier
                    │ SCORER      │
                    └──────┬──────┘
                           │ scored records
              ┌────────────┼────────────┐
              │            │            │
       ┌──────v──────┐ ┌──v────────┐ ┌─v──────────┐
       │   ARTICLE   │ │COMPARISON │ │   TREND    │
       │  GENERATOR  │ │  TABLES   │ │  CHARTS    │
       └──────┬──────┘ └──┬────────┘ └─┬──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────v──────┐
                    │  PUBLISHED  │
                    │  CONTENT    │ served by Next.js
                    └─────────────┘
```

## Patterns to Follow

### Pattern 1: Pipeline-as-Flow (BullMQ FlowProducer)

Model the entire daily run as a BullMQ Flow where each stage is a parent that spawns child jobs.

```typescript
// lib/pipeline/flow.ts
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection: redis });

async function runDailyPipeline(date: string) {
  await flow.add({
    name: 'generate',
    queueName: 'pipeline',
    data: { date },
    children: [
      {
        name: 'build-comparison-tables',
        queueName: 'pipeline',
        data: { date },
        children: [
          {
            name: 'score',
            queueName: 'pipeline',
            data: { date },
            children: [
              {
                name: 'extract',
                queueName: 'pipeline',
                data: { date },
                children: [
                  {
                    name: 'collect',
                    queueName: 'pipeline',
                    data: { date },
                  },
                ],
              },
            ],
          },
        ],
      },
      // trend charts can also be a child of score
    ],
  });
}
```

**When:** Always. This is the backbone of the pipeline.
**Why:** BullMQ Flow guarantees parent jobs only run after all children complete. Built-in retry, progress tracking, and failure handling.

### Pattern 2: Fan-Out Crawling with Concurrency Control

Each source is an independent job. Use BullMQ's concurrency settings to avoid overwhelming providers.

```typescript
// lib/pipeline/workers/collect-worker.ts
const collectWorker = new Worker('pipeline', async (job) => {
  if (job.name !== 'collect') return;

  const sources = await db.query('SELECT * FROM sources WHERE active = true');
  const crawlJobs = sources.map(source =>
    crawlQueue.add('crawl-source', {
      sourceId: source.id,
      url: source.url,
      date: job.data.date,
    })
  );

  await Promise.all(crawlJobs);
}, {
  concurrency: 5, // max 5 concurrent crawlers
  connection: redis,
});
```

**When:** Collecting from 30+ sources.
**Why:** Prevents rate-limiting, distributes load, allows per-source error isolation.

### Pattern 3: Source-Tier Confidence Scoring

Assign confidence based on source reliability tier, not just extraction quality.

```typescript
// lib/pipeline/scoring.ts
const SOURCE_TIERS = {
  official_pricing_page: 3,   // verified
  official_docs: 3,           // verified
  official_blog: 2,           // likely
  api_docs: 2,                // likely
  changelog: 2,               // likely
  console_announcement: 1,    // low-confidence
  community: 0,               // low-confidence, flagged
};

function calculateConfidence(extraction: Extraction): 'verified' | 'likely' | 'low-confidence' {
  const tierScore = SOURCE_TIERS[extraction.sourceType] ?? 0;
  const completeness = Object.values(extraction.data).filter(Boolean).length / Object.keys(extraction.data).length;
  const total = (tierScore / 3) * 0.6 + completeness * 0.4;

  if (total >= 0.75) return 'verified';
  if (total >= 0.45) return 'likely';
  return 'low-confidence';
}
```

**When:** After every extraction.
**Why:** This is the safety layer. Prevents low-quality data from being published as fact.

### Pattern 4: Separated Runtimes (Pipeline vs. Web)

The pipeline workers and the Next.js web server are separate processes that share the database.

```
Process 1: Next.js (web server)
  - Serves public pages
  - Serves admin dashboard
  - Exposes /api/cron/trigger endpoint
  - Does NOT run pipeline workers

Process 2: BullMQ Worker(s)
  - Runs pipeline stages
  - Processes crawl, extract, score, generate jobs
  - Does NOT serve HTTP

Process 3: Scheduler (node-cron or external)
  - Triggers daily pipeline via API call or direct queue enqueue
```

**When:** Always. This is a fundamental architectural boundary.
**Why:** Long-running crawl+extract jobs (30+ sources, AI calls) would block or timeout in a serverless/web context. Separation allows independent scaling, restart, and monitoring.

### Pattern 5: Raw Evidence Preservation

Store the original fetched content alongside extracted data. Never discard raw data.

```sql
-- Every extraction links back to its source evidence
CREATE TABLE raw_data (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES sources(id),
  fetched_at TIMESTAMPTZ NOT NULL,
  content_type TEXT, -- 'html', 'json', 'text'
  raw_content TEXT NOT NULL, -- original fetched content
  content_hash TEXT, -- SHA-256 for dedup
  status TEXT DEFAULT 'pending' -- pending, extracted, failed
);

CREATE TABLE extractions (
  id UUID PRIMARY KEY,
  raw_data_id UUID REFERENCES raw_data(id),
  provider TEXT NOT NULL,
  model TEXT,
  pricing JSONB,
  promotions JSONB,
  free_tier JSONB,
  confidence TEXT, -- 'verified', 'likely', 'low-confidence'
  extracted_at TIMESTAMPTZ NOT NULL,
  extraction_prompt TEXT, -- what prompt was used
  ai_model TEXT -- which AI model did the extraction
);
```

**When:** Always. This is non-negotiable for a data intelligence platform.
**Why:** Enables auditability, rollback, re-extraction with better prompts, and confidence verification.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Pipeline in API Routes

**What:** Putting crawl/extract logic directly in Next.js API route handlers.
**Why bad:** API routes have timeout limits (10s on Vercel, configurable elsewhere). A full pipeline run for 30+ sources with AI extraction takes minutes. Jobs will timeout, leave partial state, and produce confusing errors.
**Instead:** API route enqueues a BullMQ job. Workers process it asynchronously. API route returns immediately with a job ID.

### Anti-Pattern 2: Monolithic Pipeline Function

**What:** One giant function that crawls, extracts, scores, and generates in sequence.
**Why bad:** If extraction fails for source #17, you lose all progress. No retry granularity. No parallelism. No progress tracking.
**Instead:** Each stage is a separate BullMQ job with its own error handling and retry policy.

### Anti-Pattern 3: Trusting AI Extraction Without Verification

**What:** Taking LLM output at face value and publishing directly.
**Why bad:** LLMs hallucinate. They can invent pricing, misread tables, or confuse promotional with standard pricing. Publishing false pricing damages credibility irreparably.
**Instead:** Always store raw evidence. Always score confidence. Never publish low-confidence claims without clear disclaimers. Enable admin rollback.

### Anti-Pattern 4: Hardcoding Source URLs

**What:** Source URLs embedded in code, requiring redeployment to add/change sources.
**Why bad:** 30+ sources means frequent URL changes, new providers, retired endpoints. Code changes for each are unsustainable.
**Instead:** Sources table in PostgreSQL. Crawlers read from DB. Admin dashboard can add/edit/deactivate sources.

### Anti-Pattern 5: Single AI Provider Dependency

**What:** All extraction and generation calls go to one AI provider.
**Why bad:** Rate limits, outages, or pricing changes affect the entire pipeline. If the provider is down, the daily pipeline fails completely.
**Instead:** Abstract AI calls behind an interface. Support multiple providers (Claude, OpenAI, etc.) with fallback logic.

## Database Schema (Core Tables)

```sql
-- Source configuration
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL, -- official_pricing_page, official_docs, etc.
  provider TEXT NOT NULL, -- openai, anthropic, etc.
  active BOOLEAN DEFAULT true,
  crawl_config JSONB, -- headers, selectors, special handling
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Raw fetched content
CREATE TABLE raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  fetched_at TIMESTAMPTZ NOT NULL,
  content_type TEXT,
  raw_content TEXT NOT NULL,
  content_hash TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- Structured extractions
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data_id UUID REFERENCES raw_data(id),
  provider TEXT NOT NULL,
  model TEXT,
  data JSONB NOT NULL, -- structured extraction result
  confidence TEXT,
  extracted_at TIMESTAMPTZ NOT NULL,
  extraction_prompt TEXT,
  ai_model TEXT
);

-- Generated articles
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- markdown
  summary TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, rolled_back
  published_at TIMESTAMPTZ,
  generation_prompt TEXT,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pipeline run tracking
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  stage TEXT NOT NULL, -- collect, extract, score, generate
  status TEXT NOT NULL, -- running, completed, failed
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  stats JSONB -- sources crawled, extractions made, etc.
);

-- Practical cost examples (pre-computed)
CREATE TABLE practical_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID REFERENCES extractions(id),
  scenario TEXT NOT NULL, -- '10_long_prompts', '100_leetcode_hard', etc.
  estimated_cost_usd NUMERIC,
  estimated_tokens_input INT,
  estimated_tokens_output INT,
  computed_at TIMESTAMPTZ DEFAULT now()
);
```

## Build Order (Dependencies)

The architecture dictates a strict build order based on component dependencies:

```
Layer 0: Foundation (no dependencies)
├── PostgreSQL schema + migrations
├── Redis connection
├── BullMQ queue setup
└── Next.js project scaffold

Layer 1: Data Ingestion (depends on Layer 0)
├── Sources table CRUD
├── Source crawler framework (fetch + store raw_data)
├── Single-source crawl worker
└── Multi-source fan-out with concurrency

Layer 2: AI Processing (depends on Layer 1)
├── AI provider abstraction (multi-provider interface)
├── Extraction prompt engineering
├── Extraction worker (raw_data -> extractions)
└── Confidence scoring logic

Layer 3: Content Generation (depends on Layer 2)
├── Article generation worker
├── Comparison table builder
├── Trend chart data aggregator
└── Practical cost calculator

Layer 4: Publishing & Frontend (depends on Layer 3)
├── Public article pages
├── Comparison table components
├── Trend chart components
└── Practical cost display

Layer 5: Admin & Operations (depends on Layer 4)
├── Admin dashboard (pipeline status, data review)
├── Admin edit/rollback actions
├── Pipeline run logging + monitoring
└── Error alerting
```

### Why This Order

1. **Layer 0 first:** Nothing works without the database, queue, and project scaffold. This is pure infrastructure with zero business logic.

2. **Layer 1 before Layer 2:** You need raw data before you can extract from it. Start with one source, prove the crawl-store pipeline, then fan out to 30+.

3. **Layer 2 before Layer 3:** You need scored extractions before you can generate articles from them. The confidence scoring system is the safety gate.

4. **Layer 3 before Layer 4:** You need generated content before you can display it. Frontend is a consumer, not a producer.

5. **Layer 5 last:** Admin dashboard is the operational layer. It's valuable but not essential for the core pipeline to function. The pipeline can run without admin oversight in v1 (confidence scoring handles safety).

### Within-Layer Ordering

**Layer 1:** Single source first, then fan-out. Prove the pattern works for one provider before scaling to 30+.

**Layer 2:** Extraction prompt engineering is the hardest part. Start with the easiest provider (one with clean, structured pricing pages) and iterate on prompts.

**Layer 3:** Article generation first (highest user value), then comparison tables, then trend charts (needs historical data, so it's naturally later).

## Scalability Considerations

| Concern | At 30 Sources (v1) | At 100 Sources | At 500 Sources |
|---------|-------------------|----------------|----------------|
| Crawl duration | ~5 min sequential | ~15 min, needs concurrency | Distributed workers, rate-limit queues |
| AI extraction cost | ~$0.50/day | ~$2/day | Prompt optimization, caching, batch API |
| Database size | ~100MB/year | ~500MB/year | Partitioning, archival strategy |
| Article generation | 1 article/day | 1 per category/day | Template-driven, category-specific |
| Pipeline reliability | Single worker | Worker pool | Dead letter queues, circuit breakers |

## Sources

- BullMQ documentation: https://docs.bullmq.io/ (FlowProducer, repeatable jobs, worker concurrency)
- Next.js App Router: https://nextjs.org/docs/app (API routes, route handlers)
- Web scraping pipeline patterns: Crawlee, Scrapy architecture documentation
- Confidence scoring patterns: Great Expectations data quality framework
- PostgreSQL JSONB for flexible extraction storage: common pattern in data pipelines

---

*Architecture confidence: MEDIUM-HIGH. Patterns are well-established (ETL + job queue + web frontend). The novel aspect is the AI extraction + confidence scoring layer, which will need iteration during implementation. BullMQ FlowProducer dependency tracking is documented but not battle-tested at the 30+ source scale in this specific context.*
