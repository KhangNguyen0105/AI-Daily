# Phase 1: Foundation & Pipeline Core - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding with working infrastructure (Docker, Next.js, PostgreSQL, Redis, BullMQ) and establishing the provider adapter pattern that all future data collection depends on. This phase delivers: a running Docker Compose stack, a database schema for the full pipeline, a BullMQ job orchestration framework, and one working provider adapter (OpenAI) proving the end-to-end flow from crawl to display.

</domain>

<decisions>
## Implementation Decisions

### Provider Adapter Interface
- **D-01:** Adapters use an abstract base class pattern. The base class provides default implementations for common logic (retry, logging, proxy rotation).
- **D-02:** Each adapter implements three methods: `crawl()` (fetch raw HTML/JSON), `extract()` (parse into structured data), `normalize()` (map to standard schema). These match the pipeline stages.
- **D-03:** Adapters are registered via an explicit import registry — a central file imports and registers each adapter. Simple, debuggable, no magic.
- **D-04:** The base class handles infrastructure (proxy rotation, rate limiting, retry logic, HTTP client). Each adapter provides configuration (URLs, CSS selectors, extraction rules, data mappings).

### Database Schema Design
- **D-05:** Normalized relational schema with foreign keys. Core chain: `sources` → `raw_data` → `extractions`. Clean relationships, queryable, standard PostgreSQL patterns.
- **D-06:** Confidence scoring uses an enum column (`'verified' | 'likely' | 'low_confidence'`) on the `extractions` table. Simple, queryable, matches REQUIREMENTS.md DCOL-04.
- **D-07:** Raw evidence stored as JSONB columns: `raw_data.evidence` (full HTML/JSON response) and `extractions.raw_evidence` (extracted snippet). Flexible storage without schema changes.
- **D-08:** Standard timestamps on all tables: `created_at`, `updated_at`. The `extractions` table also has `collected_at` (when data was actually fetched from the source).

### Pipeline Job Flow
- **D-09:** Separate BullMQ queues per pipeline stage: `collect`, `extract`, `score`, `generate`. Each stage's completion triggers the next stage's jobs. Clean separation, independent scaling.
- **D-10:** Worker-triggered chaining — each stage's worker adds the next stage's job(s) on completion. No central orchestrator; each worker owns its handoff logic.
- **D-11:** Four distinct pipeline stages: (1) collect: crawl provider page, store raw HTML; (2) extract: AI parses HTML into structured data; (3) score: assign confidence based on source tier and extraction completeness; (4) generate: create daily article from extracted data.
- **D-12:** Exponential backoff with max 3 retries per job. Failed jobs go to a dead-letter queue for admin review. Standard resilience pattern.

### Seed Provider & First Crawl
- **D-13:** OpenAI is the first provider adapter. Most popular API, well-structured pricing page, representative of real-world complexity.
- **D-14:** First crawl extracts core pricing data only: model name, input price per 1M tokens, output price per 1M tokens, context window. Minimum viable data to prove the pipeline.
- **D-15:** End-to-end means: crawl OpenAI pricing page → store raw HTML → extract pricing data → save to PostgreSQL → display on a minimal page. Full loop with basic visual proof.
- **D-16:** Playwright (via Crawlee) for all pages. Reliable JavaScript rendering, consistent approach across providers. No HTTP-first fallback in Phase 1.

### Claude's Discretion
No areas were explicitly deferred to Claude. All decisions were user-selected.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project definition, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 44 v1 requirements with traceability to phases
- `.planning/ROADMAP.md` — Phase definitions, success criteria, execution order
- `CLAUDE.md` — Full tech stack specification with versions and rationale

### Requirements in Scope (Phase 1)
- `REQUIREMENTS.md` § DCOL-06 — Provider adapter pattern
- `REQUIREMENTS.md` § FRNT-01 — Read-only public site (no visitor registration)
- `REQUIREMENTS.md` § FRNT-02 — Next.js 16 App Router with SSG

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is the first phase. No existing code to reuse.

### Established Patterns
- Tech stack fully specified in `CLAUDE.md` — all library choices are locked
- Drizzle ORM for database — SQL-like syntax, TypeScript inference, Drizzle Kit for migrations
- BullMQ for job orchestration — built-in retry, rate limiting, job chaining
- Crawlee + Playwright for crawling — proxy rotation, session management, fingerprint protection

### Integration Points
- Docker Compose orchestrates all services: Next.js, PostgreSQL, Redis, BullMQ worker
- Next.js API routes serve as the backend for admin operations (future phases)
- Drizzle schema defines the data model that all pipeline stages write to
- BullMQ workers are separate Node.js processes that connect to Redis

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the standard approaches captured in decisions above. The user chose recommended options consistently, indicating preference for proven, standard patterns over novel approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation & Pipeline Core*
*Context gathered: 2026-06-10*
