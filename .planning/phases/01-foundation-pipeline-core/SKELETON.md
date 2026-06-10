---
phase: 01-foundation-pipeline-core
type: walking-skeleton
created: 2026-06-10
---

# Walking Skeleton: AI Daily

## What Is This?

The Walking Skeleton is the thinnest possible end-to-end slice through the entire system. It proves the architecture works before building features on top of it. Every component is minimal but real — no stubs, no mocks, no "wire it later."

## The Slice

**User action:** Visit http://localhost:3000

**What happens:**
1. BullMQ collect worker enqueues a crawl job for OpenAI
2. Crawlee PlaywrightCrawler navigates to https://developers.openai.com/api/docs/pricing
3. Raw HTML stored in PostgreSQL `raw_data.evidence` (JSONB)
4. Worker chains to extract queue
5. Extract worker sends HTML to Vercel AI SDK `generateObject()` with Zod schema
6. Structured pricing data (model name, input/output price, context window) stored in `extractions` table
7. Worker chains to score queue (pass-through in Phase 1)
8. Worker chains to generate queue (placeholder article)
9. Next.js SSG page at localhost:3000 queries `extractions` and renders a pricing table

**Proof:** A human can visit localhost:3000 and see real OpenAI pricing data in a table.

## Architectural Decisions

### Framework
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Full-stack framework | Next.js 16.2.9 | App Router with SSG, API Routes, Turbopack. Locked in CLAUDE.md. |
| UI library | React 19.x | Bundled with Next.js 16. Server Components reduce client JS. |
| Type system | TypeScript 5.x | Non-negotiable for data-heavy platform. |
| CSS | Tailwind CSS 4.3.0 | Utility-first, zero-runtime, pairs with Tremor later. |

### Database
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL 16+ | JSONB for evidence, excellent time-series queries. Locked in CLAUDE.md. |
| ORM | Drizzle ORM 0.45.2 | SQL-like syntax, lighter than Prisma (no Rust binary), fast cold starts. |
| Migrations | Drizzle Kit (push mode) | Rapid iteration in Phase 1; switch to generate+migrate when schema stabilizes. |
| Schema pattern | Normalized with FKs | sources → raw_data → extractions chain. JSONB for evidence. pgEnum for confidence. |

### Job Queue
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Queue system | BullMQ 5.78.0 | Retry, rate limiting, job chaining, dead-letter. Built-in exponential backoff. |
| Redis client | ioredis 5.11.1 | Required by BullMQ. Also caching later. |
| Queue layout | 4 separate queues | collect, extract, score, generate. One per pipeline stage per D-09. |
| Chaining | Worker-triggered | Each worker adds next stage's job on completion per D-10. |

### Scraping
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Crawler | Crawlee 3.17.0 + Playwright 1.60.0 | PlaywrightCrawler with built-in proxy rotation, session management, fingerprint protection. |
| Strategy | Playwright for all pages | OpenAI pricing page returns 403 on plain HTTP per D-16. |
| Storage | Crawlee Dataset + PostgreSQL | Crawlee for crawl session; PostgreSQL for structured data. |

### AI Integration
| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM interface | Vercel AI SDK 6.0.199 | `generateObject()` with Zod schema for structured extraction. Provider-agnostic. |
| Providers | @ai-sdk/openai, @ai-sdk/anthropic | Multi-provider support from day one. |
| Schema validation | Zod 4.4.3 | Used by AI SDK for extraction output. Also env var validation. |

### Deployment
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Containerization | Docker + Docker Compose | Mandated by PROJECT.md. Multi-stage builds for smaller images. |
| Services | 4 containers | Next.js app, PostgreSQL, Redis, BullMQ worker. |
| Worker image | Separate Dockerfile | Different base requirements (Playwright browsers). Keeps app image smaller. |

## Directory Layout

```
ai-daily/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with "AI Daily" metadata
│   ├── page.tsx                  # Public landing page (SSG + DB query)
│   └── globals.css               # Tailwind v4: @import "tailwindcss"
├── src/
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema: 6 tables, 1 enum
│   │   └── index.ts              # Database connection (drizzle + pg)
│   ├── providers/
│   │   ├── base.ts               # Abstract ProviderAdapter + interfaces
│   │   ├── registry.ts           # Explicit import registry
│   │   └── openai/
│   │       ├── config.ts         # URLs, provider name
│   │       └── adapter.ts        # crawl/extract/normalize implementation
│   ├── pipeline/
│   │   ├── queues.ts             # 4 BullMQ queues with exponential backoff
│   │   ├── workers/
│   │   │   ├── collect.ts        # Crawl → raw_data → chain to extract
│   │   │   ├── extract.ts        # AI extraction → extractions → chain to score
│   │   │   ├── score.ts          # Confidence scoring → chain to generate
│   │   │   └── generate.ts       # Article generation (placeholder)
│   │   └── worker-entry.ts       # Process entry point (creates all workers)
│   └── lib/
│       └── env.ts                # Zod-validated environment variables
├── tests/
│   ├── schema.test.ts            # Schema table validation
│   ├── landing.test.tsx          # Landing page component test
│   ├── adapter.test.ts           # Provider adapter contract test
│   ├── openai-adapter.test.ts    # OpenAI adapter registration test
│   └── pipeline.test.ts          # Queue configuration test
├── docker-compose.yml            # PostgreSQL, Redis, app, worker
├── Dockerfile                    # Multi-stage Next.js build
├── worker.Dockerfile             # Worker with Playwright chromium
├── drizzle.config.ts             # Drizzle Kit config
├── vitest.config.ts              # Test framework config
├── package.json                  # Dependencies (locked versions)
├── tsconfig.json                 # TypeScript strict mode
├── next.config.ts                # Next.js with standalone output
├── .env.example                  # Environment variable template
└── .gitignore                    # node_modules, .next, .env, drizzle
```

## Database Schema

### Tables (6 total)

**sources** — Where data comes from
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar(255) | Provider name (e.g., "openai") |
| url | text | Base URL |
| provider_type | varchar(100) | Category |
| is_active | integer | 1 = active, 0 = disabled |
| created_at, updated_at | timestamp | Auto-managed |

**raw_data** — What we crawled
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| source_id | FK → sources.id | |
| url | text | Page URL |
| evidence | jsonb | Full HTML response |
| crawled_at | timestamp | When crawl happened |
| created_at, updated_at | timestamp | Auto-managed |

**extractions** — What we extracted
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| raw_data_id | FK → raw_data.id | |
| source_id | FK → sources.id | |
| model_name | varchar(255) | e.g., "gpt-4o" |
| input_price_per_1m | real | $/1M input tokens |
| output_price_per_1m | real | $/1M output tokens |
| context_window | integer | Max tokens |
| confidence | pgEnum | 'verified' / 'likely' / 'low_confidence' |
| raw_evidence | jsonb | Extracted snippet |
| collected_at | timestamp | When data was fetched |
| created_at, updated_at | timestamp | Auto-managed |

**articles** — Generated content
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| title | varchar(500) | |
| content | text | |
| published_at | timestamp | null = not published |
| created_at, updated_at | timestamp | Auto-managed |

**pipeline_runs** — Pipeline execution log
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| status | varchar(50) | 'running' / 'completed' / 'failed' |
| started_at | timestamp | |
| completed_at | timestamp | nullable |
| stats | jsonb | { sources_attempted, succeeded, failed } |
| created_at, updated_at | timestamp | Auto-managed |

**practical_costs** — Real-world cost examples
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| extraction_id | FK → extractions.id | |
| scenario_name | varchar(255) | e.g., "10 long prompts" |
| input_tokens | integer | |
| output_tokens | integer | |
| estimated_cost | real | |
| created_at, updated_at | timestamp | Auto-managed |

### Enum

**confidence** — `'verified'`, `'likely'`, `'low_confidence'`

## Pipeline Flow

```
[Trigger] → collect queue
                ↓
    ┌───────────────────────────┐
    │  collect worker            │
    │  1. getAdapter(provider)   │
    │  2. adapter.crawl()        │
    │  3. INSERT raw_data        │
    │  4. → extractQueue.add()   │
    └───────────────────────────┘
                ↓
    ┌───────────────────────────┐
    │  extract worker            │
    │  1. SELECT raw_data        │
    │  2. adapter.extract(html)  │
    │  3. adapter.normalize()    │
    │  4. INSERT extractions     │
    │  5. → scoreQueue.add()     │
    └───────────────────────────┘
                ↓
    ┌───────────────────────────┐
    │  score worker              │
    │  1. (Phase 1: pass-through)│
    │  2. → generateQueue.add()  │
    └───────────────────────────┘
                ↓
    ┌───────────────────────────┐
    │  generate worker           │
    │  1. (Phase 1: placeholder) │
    │  2. INSERT article         │
    └───────────────────────────┘
```

Each queue: 3 attempts, exponential backoff (1s base), dead-letter on failure.

## Docker Compose Services

| Service | Image | Port | Depends On | Healthcheck |
|---------|-------|------|------------|-------------|
| postgres | postgres:16-alpine | 5432 | — | pg_isready |
| redis | redis:7-alpine | 6379 | — | redis-cli ping |
| app | Dockerfile (Next.js) | 3000 | postgres, redis | — |
| worker | worker.Dockerfile | — | postgres, redis | — |

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| REDIS_HOST | No | localhost | Redis hostname |
| REDIS_PORT | No | 6379 | Redis port |
| OPENAI_API_KEY | Yes (for extraction) | — | Vercel AI SDK OpenAI provider |
| ANTHROPIC_API_KEY | No | — | Vercel AI SDK Anthropic provider |
| NODE_ENV | No | development | Runtime environment |
| CRAWLEE_STORAGE_DIR | No | ./storage | Crawlee temp storage (set to /tmp in Docker) |

## What This Proves

1. **Docker stack works:** `docker compose up` starts PostgreSQL, Redis, Next.js, and BullMQ worker
2. **Database schema works:** Drizzle Kit push creates all 6 tables with correct types and foreign keys
3. **Provider adapter pattern works:** OpenAI adapter implements crawl/extract/normalize, registered in explicit registry
4. **Crawling works:** PlaywrightCrawler fetches real OpenAI pricing page HTML
5. **AI extraction works:** Vercel AI SDK extracts structured pricing from HTML
6. **Pipeline works:** BullMQ chains collect → extract → score → generate
7. **Display works:** Landing page queries PostgreSQL and shows real pricing data

## What This Does NOT Prove

- Multiple providers (only OpenAI)
- Real confidence scoring (pass-through)
- Article generation (placeholder)
- Admin features
- Error recovery at scale
- Production deployment

These are Phase 2+ concerns.

## How to Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start Docker services
docker compose up -d postgres redis

# 3. Push database schema
pnpm db:push

# 4. Start the app
pnpm dev

# 5. Start the worker (separate terminal)
pnpm tsx src/pipeline/worker-entry.ts

# 6. Trigger a pipeline run (via BullMQ or API — Phase 2 adds scheduling)
# For now, manually add a job to the collect queue

# 7. Visit http://localhost:3000
```

## Extending the Skeleton

To add a new provider (Phase 2):
1. Create `src/providers/{provider}/config.ts` with URLs
2. Create `src/providers/{provider}/adapter.ts` extending ProviderAdapter
3. Import and register in `src/providers/registry.ts`
4. Done — pipeline workers already use getAdapter()

To add a new pipeline stage:
1. Create queue in `src/pipeline/queues.ts`
2. Create worker in `src/pipeline/workers/`
3. Chain from existing worker
4. Add to `src/pipeline/worker-entry.ts`
