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
- [x] **Phase 4: Practical Cost Calculator** - Real-world cost scenarios (prompts, coding, documents, agents) with side-by-side comparison
- [x] **Phase 5: Model Detail Pages** - Per-model profile with pricing history, promotions, and provider links
- [x] **Phase 6: Daily Content Engine** - Auto-generated daily articles with chronological archive
- [x] **Phase 7: Intelligence & Analytics** - Trend charts, promotion tracker, multi-model comparison, and price alerts
- [x] **Phase 8: Admin Operations** - Pipeline monitoring, content editing/rollback, source management, and admin auth
- [x] **Phase 9: Dark Mode & Theme System** - CSS custom properties, theme toggle, and conversion of all hardcoded colors to semantic token classes
- [x] **Phase 10: Consumer Pricing & Subscription Intelligence** - Consumer subscription plan collection, 10 provider adapters, /subscriptions page, and free trial surfacing
- [ ] **Phase 11: Digest & Free Offers Enhancement** - Redesign digest page with prominent free models cards, direct provider links, and structured promotions display

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
**Wave 1**

- [x] 03-01-PLAN.md — Data layer + interactive table: Drizzle JOIN query, utility functions, @tanstack/react-table with sorting, confidence badges
- [x] 03-02-PLAN.md — Search, filters, provider logos: global text search, provider dropdown, free tier checkbox, SVG logos, model family grouping

**Wave 2** *(blocked on Wave 1 completion)*

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
- [x] 05-04-PLAN.md — PricingTable integration: clickable model names with slug-based navigation

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

**Status**: ✅ COMPLETE (verified 2026-06-14, code reviewed with 14 issues fixed)
**Plans**: 3 plans
Plans:

- [x] 06-01-PLAN.md — Schema extensions (date, summary columns) + article diff computation module
- [x] 06-02-PLAN.md — AI article generator with provider fallback + real generate worker
- [x] 06-03-PLAN.md — Frontend digest pages (/digest, /digest/[date]) + site navigation

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

**Status**: ✅ COMPLETE (verified 2026-06-15, 18/18 tests pass)
**Plans**: 4 plans
Plans:

- [x] 07-01-PLAN.md — Navigation + alerts utility: TopNav links for all Phase 7 pages, localStorage alerts CRUD, /alerts management page
- [x] 07-02-PLAN.md — Trends page: per-model pricing trend charts with visual markers (green/red dots, amber stars) via Recharts
- [x] 07-03-PLAN.md — Promotions page: card grid layout with type filter, active/expired sorting, data from promotions table
- [x] 07-04-PLAN.md — Compare page + alerts integration: 2-5 model selector dropdowns, side-by-side comparison cards, bell icon on model detail, alert banner

**UI hint**: yes

### Phase 8: Admin Operations

**Goal**: As an admin, I want to monitor the pipeline, manage published content, and control data quality through a secure dashboard, so that I can ensure the automated system produces accurate, timely AI pricing intelligence.
**Mode:** mvp
**Depends on**: Phase 2, Phase 6
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09
**Success Criteria** (what must be TRUE):

  1. Admin can log in via NextAuth.js and access a dashboard showing pipeline health, job status, and error logs
  2. Admin can view published daily articles and their source evidence
  3. Admin can rollback a published article to a previous version
  4. Admin can mark sources as trusted/untrusted and manually trigger re-crawl for a specific provider
  5. Admin can disable auto-publish for low-confidence items and manually regenerate a daily article

**Status**: ✅ COMPLETE (verified 2026-06-15, deep code review with 9 issues fixed)
**Plans**: 7 plans
Plans:

**Wave 1**

- [x] 08-01-PLAN.md — Auth layer: NextAuth.js v5 Credentials provider, JWT sessions, middleware, login page, schema extensions

**Wave 2** *(depends on Wave 1)*

- [x] 08-02-PLAN.md — Admin layout + overview: sidebar navigation, header bar, overview dashboard with summary cards

**Wave 3** *(depends on Wave 2)*

- [x] 08-03-PLAN.md — Article list + evidence: articles list page, ConfirmDialog, Toast, source evidence API
- [x] 08-04-PLAN.md — Article edit + versioning: edit form with Markdown preview, version history, rollback, source evidence tab
- [x] 08-05-PLAN.md — Pipeline monitoring: runs table with expandable details, error log, SSE real-time updates

**Wave 4** *(depends on Wave 3)*

- [x] 08-06-PLAN.md — Pipeline actions: re-crawl, regenerate, run-full, cancel triggers, auto-publish toggle
- [x] 08-07-PLAN.md — Source management: sources table with filters, trust toggle, expandable details

**UI hint**: yes

### Phase 9: Dark Mode & Theme System

**Goal**: Implement a complete dark mode and theme system with CSS custom properties, React context provider, theme toggle, and convert all hardcoded color classes across the entire application to theme-aware token classes.
**Depends on**: Phase 8
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):

  1. User can see a sun/moon toggle button in the TopNav
  2. Clicking the toggle switches between light and dark theme
  3. Theme preference persists across page refresh (localStorage)
  4. On first visit, system preference (prefers-color-scheme) is used as default
  5. No flash of wrong theme on page load
  6. All components render correctly in both light and dark themes

**Status**: ✅ COMPLETE (verified 2026-06-18, 46+ files converted, 202+ theme token occurrences)
**Plans**: 6 plans
Plans:

**Wave 1**

- [x] 09-01-PLAN.md — Theme foundation: CSS custom properties, ThemeProvider, ThemeToggle, layout integration

**Wave 2**

- [x] 09-02-PLAN.md — Core page color conversion: HomePageClient, CostCalculator, ModelDetailClient
- [x] 09-03-PLAN.md — PricingTable color conversion: ~48 class replacements
- [x] 09-05-PLAN.md — Admin layout and pages: sidebar, header, login, articles, pipeline, sources

**Wave 3**

- [x] 09-04-PLAN.md — Public components: 16 files including DigestArticle, AlertsPageClient, charts, toggles
- [x] 09-06-PLAN.md — Admin components + final verification: tables, forms, utility files, full-project grep

**UI hint**: yes

### Phase 10: Consumer Pricing & Subscription Intelligence

**Goal**: Expand data collection beyond API pricing to include consumer-facing subscription plans (ChatGPT Plus/Pro, Gemini Advanced, Claude Pro/Max, Perplexity Pro, etc.) and their free trials, promotional offers, and beta programs. Users can see what consumer AI products cost and what free trials are available.
**Depends on**: Phase 2, Phase 9
**Requirements**: DCOL-08, DCOL-09
**Success Criteria** (what must be TRUE):

  1. System collects subscription plan pricing from at least 5 consumer AI providers (ChatGPT, Gemini, Claude, Perplexity, Copilot)
  2. Each subscription plan captures: plan name, monthly price, annual price (if available), free trial duration, key features
  3. Free trial and promotional offers are captured with start/end dates when available
  4. Consumer pricing data is displayed on a dedicated page alongside API pricing
  5. Promotions page shows subscription-based free trials alongside API free tiers

**Status**: ✅ COMPLETE (verified 2026-06-19, 33/33 tests pass)
**Plans**: 3 plans
Plans:

**Wave 1**

- [x] 10-01-PLAN.md — Schema + consumer adapter infrastructure: subscription_plans table, billingPeriodEnum, free_trial enum, ConsumerAdapter base class, consumer registry

**Wave 2** *(depends on Wave 1)*

- [x] 10-02-PLAN.md — 10 consumer adapters + pipeline integration: Tier 1 + Tier 2 adapters with expectedPlanNames, adapter timeouts, failure isolation, extract worker upsert, orchestrator integration
- [x] 10-03-PLAN.md — Subscriptions page + responsive nav + virtual projection: /subscriptions page with card grid, filter pills, TopNav mobile menu, virtual projection of free trials on /promotions

**UI hint**: yes

### Phase 11: Digest & Free Offers Enhancement

**Goal**: Redesign the digest page to prominently display free models and promotions with direct provider links, replacing the current text-based approach with structured card components.
**Mode:** enhancement
**Depends on**: Phase 6, Phase 10
**Requirements**: UI-04, UI-05
**Success Criteria** (what must be TRUE):

  1. Free models displayed as prominent cards with green "FREE" badge
  2. Each card links directly to provider pricing page
  3. Promotions section shows discounts with provider links
  4. No raw markdown formatting visible in UI
  5. Mobile responsive design
  6. Works in both light and dark themes

**Status**: 🔄 IN PROGRESS
**Plans**: 1 plan
Plans:

- [ ] 11-01-PLAN.md — Digest & Free Offers Enhancement: card components, provider links, structured promotions display

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Pipeline Core | 3/3 | Execution complete | 2026-06-10 |
| 2. Data Collection Pipeline | 10/10 | Complete   | 2026-06-16 |
| 3. Pricing Comparison Table | 4/4 | Complete | 2026-06-13 |
| 4. Practical Cost Calculator | 3/3 | Complete | 2026-06-13 |
| 5. Model Detail Pages | 4/4 | Complete | 2026-06-14 |
| 6. Daily Content Engine | 3/3 | Complete | 2026-06-14 |
| 7. Intelligence & Analytics | 4/4 | Complete | 2026-06-15 |
| 8. Admin Operations | 7/7 | Complete | 2026-06-15 |
| 9. Dark Mode & Theme System | 6/6 | Complete | 2026-06-18 |
| 10. Consumer Pricing & Subscription Intelligence | 3/3 | Complete | 2026-06-19 |
| 11. Digest & Free Offers Enhancement | 1/1 | In Progress | - |
