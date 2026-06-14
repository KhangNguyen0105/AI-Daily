# Roadmap: AI Daily

## Overview

AI Daily is an automated AI model pricing intelligence platform. The roadmap builds from infrastructure through data collection, then layers user-facing features: pricing tables, practical cost visualization, model details, daily articles, intelligence analytics, and finally admin operations. Each phase delivers a complete, verifiable capability. The data pipeline must be built first (Phases 1-2) because every user-facing feature depends on collected data. Phases 3-7 deliver vertical slices of user value. Phase 8 completes the operational layer.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Pipeline Core** - Project scaffold with working infrastructure and provider adapter pattern
- [x] **Phase 2: Data Collection Pipeline** - Automated collection, extraction, scoring, and verification from 10+ providers
- [x] **Phase 3: Pricing Comparison Table** - Sortable/filterable pricing table with confidence badges and source attribution
- [ ] **Phase 4: Practical Cost Calculator** - Real-world cost scenarios (prompts, coding, documents, agents) with side-by-side comparison
- [ ] **Phase 5: Model Detail Pages** - Per-model profile with pricing history, promotions, and provider links
- [ ] **Phase 6: Daily Content Engine** - Auto-generated daily articles with chronological archive
- [ ] **Phase 7: Intelligence & Analytics** - Trend charts, promotion tracker, multi-model comparison, and price alerts
- [ ] **Phase 8: Admin Operations** - Pipeline monitoring, content editing/rollback, source management, and admin auth

## Phase Details

### Phase 1: Foundation & Pipeline Core
**Goal**: Project is scaffolded with working infrastructure and the provider adapter pattern is established so that data collection can begin.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FRNT-01, FRNT-02, DCOL-06
**Success Criteria** (what must be TRUE):
  1. `docker compose up` starts Next.js, PostgreSQL, Redis, and BullMQ worker without errors
  2. A single provider adapter (e.g., OpenAI) can crawl its pricing page and store raw data in PostgreSQL
  3. The BullMQ pipeline flow (collect -> extract -> score -> generate) executes end-to-end with test data
  4. The Next.js app serves a public page at localhost:3000 with "AI Daily" branding and no registration/login prompts
  5. Database schema supports all core tables (sources, raw_data, extractions, articles, pipeline_runs, practical_costs)
**Status**: ✅ COMPLETE (verified 2026-06-10, code reviewed with 12 auto-fixes)
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffold: Next.js 16, Docker Compose (PostgreSQL, Redis, app), Drizzle schema with 6 tables, public landing page
- [x] 01-02-PLAN.md — Provider adapter pattern: abstract base class, explicit registry, OpenAI adapter with crawl/extract/normalize
- [x] 01-03-PLAN.md — BullMQ pipeline: 4 queues with chaining, worker entry point, landing page displays extracted data

### Phase 2: Data Collection Pipeline
**Goal**: The system automatically collects, extracts, and scores pricing data from 10+ AI providers daily with confidence scoring and hallucination prevention.
**Status**: ✅ COMPLETE (verified 2026-06-11, 116/116 tests pass)
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DCOL-01, DCOL-02, DCOL-03, DCOL-04, DCOL-05, DCOL-07
**Success Criteria** (what must be TRUE):
  1. The daily pipeline crawls official pricing pages from at least 10 providers and stores raw content with source URLs
  2. AI extraction converts raw HTML/JSON into structured pricing records (model name, input/output price, context window)
  3. Each extraction receives a confidence score (verified/likely/low-confidence) based on source tier and completeness
  4. Two-pass verification flags and quarantines extractions where the second pass disagrees with the first
  5. A pipeline run completes within 30 minutes and logs structured stats (sources attempted, succeeded, failed)
**Plans**: 4 plans
Plans:
- [x] 02-01-PLAN.md — 11 provider adapters: Anthropic, Google, Mistral, Cohere, Groq, Together, Perplexity, xAI, Fireworks, DeepSeek, Bedrock + registry integration
- [x] 02-02-PLAN.md — Confidence scoring and two-pass verification: source tier types, confidence calculator, evidence-anchored verification
- [x] 02-03-PLAN.md — Pipeline orchestrator and score worker: orchestrateDailyRun, real verification in score worker, stats tracking
- [x] 02-04-PLAN.md — Daily scheduler and integration: BullMQ repeatable jobs, worker entry wiring, collect worker pipelineRunId propagation

### Phase 3: Pricing Comparison Table
**Goal**: Users can view, sort, filter, and search a comparison table of AI model pricing with source attribution, confidence indicators, and the ability to toggle display currency between USD and VND.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, FRNT-03, FRNT-04
**Success Criteria** (what must be TRUE):
  1. User can view a table of all models with input/output pricing per 1M tokens and context window
  2. User can sort by any column (price, context window, provider) and filter by provider, price range, and free tier availability
  3. User can search across model names and providers via full-text search
  4. Each pricing row shows a confidence badge (green/yellow/red) and links to its source with a last-updated timestamp
  5. The table is responsive on mobile browsers and displays "Last updated: [date]" for data freshness
  6. User can toggle the pricing display between USD and VND, and all price columns automatically convert and update in place
**Status**: ✅ COMPLETE (verified 2026-06-13, 186/186 tests pass, code reviewed with 6 auto-fixes)
**Plans**: 4 plans
Plans:
Plans:
- [x] 03-01-PLAN.md — Data layer + interactive table: Drizzle JOIN query, utility functions, @tanstack/react-table with sorting, confidence badges
- [x] 03-02-PLAN.md — Search, filters, provider logos: global text search, provider dropdown, free tier checkbox, SVG logos, model family grouping
- [x] 03-03-PLAN.md — Source attribution, mobile responsive: source links, last-updated timestamps, responsive column visibility, mobile layout
- [x] 03-04-PLAN.md — USD/VND currency toggle: currency conversion utilities, VND formatting, toggle UI in PricingTable
**UI hint**: yes
**Stitch Integration**: ✅ COMPLETE (2026-06-13) — Integrated Stitch-generated UI design with dark theme, SideNav, TopBar, Footer, ScenarioCards, DigestCard, and updated PricingTable styling

### Phase 4: Practical Cost Calculator
**Goal**: Users can understand what AI models actually cost in real-world usage through four practical cost scenarios with side-by-side comparison.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: COST-01, COST-02, COST-03, COST-04, COST-05, COST-06
**Success Criteria** (what must be TRUE):
  1. User can see cost per "10 long prompts" for each model with input/output token breakdown
  2. User can see cost per "100 LeetCode Hard tasks" for each model with input/output token breakdown
  3. User can see cost to "Summarize a 100-page document" for each model with input/output token breakdown
  4. User can see cost per "1 coding-agent session" for each model with input/output token breakdown
  5. User can compare practical costs side-by-side across multiple models ranked cheapest to most expensive
**Plans**: 3 plans
Plans:
- [x] 04-01-PLAN.md — Cost scenario definitions and calculation utilities: COST_SCENARIOS, calculatePracticalCost, calculateScenarioCosts
- [x] 04-02-PLAN.md — CostCalculator client component: scenario tabs, ranked model list, input/output breakdown, cheapest-model highlight
- [x] 04-03-PLAN.md — Landing page integration: CostCalculator section below PricingTable, shared currency state between components
**UI hint**: yes

### Phase 5: Model Detail Pages
**Goal**: Users can drill into a specific model's full profile including pricing, history, promotions, and related daily digest mentions.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MDTL-01, MDTL-02, MDTL-03, MDTL-04, MDTL-05, MDTL-06
**Success Criteria** (what must be TRUE):
  1. User can view a model detail page with current pricing (input/output per 1M tokens and context window)
  2. User can see a line chart showing the model's price changes over time
  3. The detail page shows context window, model family, and release date
  4. Active free tier and promotion status are displayed on the detail page
  5. The detail page links to provider docs, API, and playground, and shows recent mentions in daily digests
**Plans**: 4 plans
Plans:
- [x] 05-01-PLAN.md — Schema + utilities: promotions table, slug generation, provider links
- [x] 05-02-PLAN.md — Server route + data fetching: /model/[slug] page with generateStaticParams
- [x] 05-03-PLAN.md — Client components: ModelDetailClient, PricingGrid, PriceHistoryChart, PromotionsList, ProviderLinks
- [ ] 05-04-PLAN.md — PricingTable integration: clickable model names with slug-based navigation
**UI hint**: yes

### Phase 6: Daily Content Engine
**Goal**: The system auto-generates and publishes a daily article covering AI pricing changes, and users can browse the archive.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04
**Success Criteria** (what must be TRUE):
  1. A daily article is auto-generated covering new model releases, pricing changes, promotions, and notable trends
  2. User can view a chronological archive of all past daily digests
  3. Each digest uses a scannable format: headline, key changes, pricing highlights, what to watch
  4. Article generation uses a configurable multi-provider AI backend (Claude, OpenAI, etc.)
**Plans**: TBD
**UI hint**: yes

### Phase 7: Intelligence & Analytics
**Goal**: Users can explore pricing trends, track promotions, compare models across dimensions, and set price alerts.
**Mode:** mvp
**Depends on**: Phase 3, Phase 5
**Requirements**: INTL-01, INTL-02, INTL-03, INTL-04, INTL-05
**Success Criteria** (what must be TRUE):
  1. User can view pricing trend charts showing price changes per model over time with price drops and new launches highlighted
  2. User can view a dedicated promotion/free tier tracker showing active promotions, beta trials, and free credits with expiration dates
  3. User can select 2-5 models for side-by-side multi-dimensional comparison (pricing, context window, practical cost, free tier status)
  4. User can set price threshold alerts for specific models
**Plans**: TBD
**UI hint**: yes

### Phase 8: Admin Operations
**Goal**: Admin can monitor the pipeline, manage published content, and control data quality through a secure dashboard.
**Mode:** mvp
**Depends on**: Phase 2, Phase 6
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09
**Success Criteria** (what must be TRUE):
  1. Admin can log in via NextAuth.js and access a dashboard showing pipeline health, job status, and error logs
  2. Admin can view published daily articles with their source evidence and edit wrong information
  3. Admin can rollback a published article to a previous version
  4. Admin can mark sources as trusted/untrusted and manually trigger re-crawl for a specific provider
  5. Admin can disable auto-publish for low-confidence items and manually regenerate a daily article
**Plans**: TBD
**UI hint**: yes
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Pipeline Core | 3/3 | Execution complete | 2026-06-10 |
| 2. Data Collection Pipeline | 4/4 | Execution complete | 2026-06-11 |
| 3. Pricing Comparison Table | 4/4 | Complete   | 2026-06-13 |
| 4. Practical Cost Calculator | 3/3 | Complete | 2026-06-13 |
| 5. Model Detail Pages | 3/4 | In Progress | - |
| 6. Daily Content Engine | 0/0 | Not started | - |
| 7. Intelligence & Analytics | 0/0 | Not started | - |
| 8. Admin Operations | 0/0 | Not started | - |
