# Phase 1: Foundation & Pipeline Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 1-Foundation & Pipeline Core
**Areas discussed:** Provider Adapter Interface, Database Schema Design, Pipeline Job Flow, Seed Provider & First Crawl

---

## Provider Adapter Interface

### How should provider adapters be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Abstract base class | Abstract class with default implementations. Providers extend it and override what they need. Easier to add common logic later (retry, logging). | ✓ |
| Interface / contract only | TypeScript interface that each provider implements from scratch. More flexibility, but no shared logic. | |
| Config object + functions | Functional approach — each adapter is a plain object with crawl/extract/normalize functions. Simplest, but harder to share state. | |

**User's choice:** Abstract base class (Recommended)
**Notes:** User consistently selected recommended options, indicating preference for proven patterns.

### What methods should each adapter implement?

| Option | Description | Selected |
|--------|-------------|----------|
| crawl + extract + normalize | crawl() fetches raw HTML/JSON, extract() parses into structured data, normalize() maps to standard schema. Three distinct steps matching the pipeline. | ✓ |
| crawl + extract only | crawl() and extract() only. Normalization happens at the pipeline level, not in the adapter. | |
| Single collect() method | Single collect() method that does everything. Simplest, but harder to retry individual steps. | |

**User's choice:** crawl + extract + normalize (Recommended)

### How should adapters be registered and discovered?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit import registry | Each adapter exports itself, a central registry file imports and registers them. Simple, explicit, easy to debug. | ✓ |
| Self-registration pattern | Adapters self-register via a decorator or static method. More magic, but adding a new adapter doesn't touch the registry. | |
| Dynamic directory scan | Scan the adapters directory at runtime. Most flexible, but harder to type-check and debug. | |

**User's choice:** Explicit import registry (Recommended)

### What goes in the base class vs provider-specific?

| Option | Description | Selected |
|--------|-------------|----------|
| Base handles infra, adapter handles config | Common crawl logic (proxy rotation, retry, rate limiting) lives in the base class. Each adapter only provides URLs, selectors, and extraction rules. | ✓ |
| Base provides hooks, adapter chooses tools | Base class provides interfaces/hooks. Each adapter chooses its own crawler (Playwright vs HTTP). More flexible but more boilerplate. | |
| Minimal base, full adapter control | Minimal base. Each adapter is responsible for its own crawling infrastructure. | |

**User's choice:** Base handles infra, adapter handles config (Recommended)

---

## Database Schema Design

### How should the core tables relate to each other?

| Option | Description | Selected |
|--------|-------------|----------|
| Normalized with foreign keys | Separate tables with foreign keys. sources → raw_data → extractions. Clean relationships, easier queries, but more joins. | ✓ |
| JSONB-heavy, fewer tables | Raw data and extractions stored as JSONB in the source row. Fewer tables, but harder to query individual extractions. | |
| Event-sourced pattern | Events table (pipeline_runs) stores everything as append-only JSONB events. Flexible but harder to query for current state. | |

**User's choice:** Normalized with foreign keys (Recommended)

### How should confidence scoring be represented in the schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Enum column on extractions | enum column ('verified' | 'likely' | 'low_confidence') on extractions table. Simple, queryable, matches requirements. | ✓ |
| Separate confidence table | Separate confidence_scores table with evidence, reasoning, and score. More detail, but more complex. | |
| Numeric score (0-100) | Numeric score (0-100) with thresholds for display. More granular, but needs mapping logic. | |

**User's choice:** Enum column on extractions (Recommended)

### How should raw evidence be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| JSONB on both raw_data and extractions | raw_data table has a jsonb 'evidence' column storing the full HTML/JSON response. extractions table has a jsonb 'raw_evidence' column storing the extracted snippet. | ✓ |
| Separate evidence table | Evidence stored in a separate evidence table linked by foreign key. Cleaner schema but more joins. | |
| File paths, not in DB | Evidence stored as file paths pointing to disk/object storage. Database stays small, but adds storage dependency. | |

**User's choice:** JSONB on both raw_data and extractions (Recommended)

### How should timestamps and versioning work across tables?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard timestamps | Every table gets created_at and updated_at. extractions also gets collected_at (when the data was actually fetched). Standard pattern. | ✓ |
| Minimal timestamps | Only created_at on most tables. Full timestamp audit trail only on pipeline_runs and extractions. | |
| Full audit trail | Temporal tables with full history. Most complete, but adds complexity. | |

**User's choice:** Standard timestamps (Recommended)

---

## Pipeline Job Flow

### How should BullMQ queues be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate queues per stage | One queue per stage (collect, extract, score, generate). Each stage's completion triggers the next. Clean separation, independent scaling. | ✓ |
| Single queue, typed jobs | Single queue with job types. Simpler setup, but harder to scale individual stages. | |
| Two queues (data + content) | Two queues: data pipeline (collect+extract+score) and content pipeline (generate). Groups related work. | |

**User's choice:** Separate queues per stage (Recommended)

### How should jobs chain from one stage to the next?

| Option | Description | Selected |
|--------|-------------|----------|
| Worker-triggered chaining | Each stage's worker adds the next stage's job(s) on completion. Simple, but error handling is spread across workers. | ✓ |
| Parent orchestrator job | A parent orchestrator job spawns child jobs for each stage and waits. Centralized control, but adds a coordinator. | |
| BullMQ Flow API | BullMQ Flow (parent-child) API. Built-in dependency management, but less flexible for dynamic pipelines. | |

**User's choice:** Worker-triggered chaining (Recommended)

### What does each pipeline stage actually do?

| Option | Description | Selected |
|--------|-------------|----------|
| Four distinct stages | collect: crawl provider page, store raw HTML. extract: AI parses HTML into structured data. score: assign confidence. generate: create daily article. Each stage has clear input/output. | ✓ |
| Three stages (collect+extract, score, generate) | collect+extract merged into one stage. Score and generate separate. Fewer handoffs, but harder to retry extraction independently. | |
| Three stages (collect, extract+score, generate) | collect: crawl+store. extract+score: AI extraction with built-in confidence. generate: article. Combines extraction and scoring since they're tightly coupled. | |

**User's choice:** Four distinct stages (Recommended)

### How should pipeline job failures be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential backoff + dead-letter | Exponential backoff with max 3 retries per job. Failed jobs go to a dead-letter queue for manual review. Standard pattern. | ✓ |
| Simple retry, fixed delay | Simple retry with fixed delay. Max 3 attempts. Simpler but less resilient to transient failures. | |
| No auto-retry, manual re-trigger | No automatic retries. Failures logged and admin can manually re-trigger. Simplest, but requires human intervention. | |

**User's choice:** Exponential backoff + dead-letter (Recommended)

---

## Seed Provider & First Crawl

### Which provider should be the first adapter?

| Option | Description | Selected |
|--------|-------------|----------|
| OpenAI | Most popular API. Pricing page is well-structured HTML. Good first target for proving the pipeline. | ✓ |
| Anthropic | Growing popularity. Pricing page is clean. Good alternative if OpenAI's page is too complex. | |
| Mistral AI | Simple pricing page. Easy to crawl, but less representative of real-world complexity. | |

**User's choice:** OpenAI (Recommended)

### What data points should the first crawl extract?

| Option | Description | Selected |
|--------|-------------|----------|
| Core pricing only | Model name, input price per 1M tokens, output price per 1M tokens, context window. Minimum viable data to prove the pipeline. | ✓ |
| Pricing + limits | Core pricing + cache pricing, rate limits, and max output tokens. More complete, but harder to extract. | |
| Full model metadata | Everything available: pricing, limits, model family, release date, capabilities. Most complete, but highest extraction risk. | |

**User's choice:** Core pricing only (Recommended)

### What does 'working end-to-end' mean for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Full loop, minimal UI | Crawl OpenAI pricing page → store raw HTML → extract pricing data → save to PostgreSQL → display on a simple page. Full loop, minimal UI. | ✓ |
| Data pipeline only, no UI | Crawl + extract + store. No UI yet — just prove data flows through the pipeline. Verify via database queries. | |
| Full loop + basic table | Full loop + a basic comparison table showing extracted data. More visual proof, but more frontend work. | |

**User's choice:** Full loop, minimal UI (Recommended)

### How should the crawler handle OpenAI's pricing page?

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright for all pages | Use Playwright (via Crawlee) to render JavaScript-heavy pricing pages. More reliable, but slower and heavier. | ✓ |
| HTTP first, Playwright fallback | Try HTTP + Cheerio first. Fall back to Playwright only if extraction fails. Faster for static pages. | |
| Adapter's choice | Let each adapter choose its own crawler. Most flexible, but inconsistent. | |

**User's choice:** Playwright for all pages (Recommended)

---

## Claude's Discretion

No areas were explicitly deferred to Claude. All decisions were user-selected from recommended options.

## Deferred Ideas

None — discussion stayed within phase scope.
