# Requirements: AI Daily

**Defined:** 2026-06-10
**Core Value:** Developers can instantly understand what AI models actually cost in real-world usage — not per-token abstractions, but practical examples like prompts, coding tasks, document processing, and agent sessions.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [ ] **DCOL-01**: System crawls official pricing pages, docs, blogs, API docs, changelogs, and console announcements from 30+ AI providers daily
- [ ] **DCOL-02**: System uses AI-powered extraction to convert source data into structured pricing/promotion/model update records
- [ ] **DCOL-03**: System stores raw source URLs and evidence snippets alongside extracted data
- [ ] **DCOL-04**: System assigns confidence scores (verified / likely / low-confidence) to all collected data based on source tier and extraction completeness
- [ ] **DCOL-05**: System runs collection on a daily fixed-time schedule via BullMQ job orchestration
- [ ] **DCOL-06**: System uses provider adapter pattern — each provider has format-specific extraction logic, not a universal scraper
- [ ] **DCOL-07**: System applies two-pass verification to prevent LLM hallucination from publishing wrong prices

### Pricing Display

- [ ] **PRIC-01**: User can view a sortable/filterable comparison table of all model pricing (input/output per 1M tokens, context window)
- [ ] **PRIC-02**: User can see provider logos and model family grouping in the pricing table
- [ ] **PRIC-03**: User can search across model names and providers via full-text search
- [ ] **PRIC-04**: User can filter by provider, price range, context window, and free tier availability
- [ ] **PRIC-05**: Each pricing data point links to its source with a last-updated timestamp
- [ ] **PRIC-06**: Each pricing data point displays a confidence badge (green/yellow/red)

### Practical Cost Visualization

- [ ] **COST-01**: User can see cost per "10 long prompts" (~1K tokens in, ~2K out) for each model
- [ ] **COST-02**: User can see cost per "100 LeetCode Hard tasks" (estimated tokens per coding problem) for each model
- [ ] **COST-03**: User can see cost to "Summarize a 100-page document" (input-heavy workload) for each model
- [ ] **COST-04**: User can see cost per "1 coding-agent session" (agentic loop with tool use) for each model
- [ ] **COST-05**: User can compare practical costs side-by-side across multiple models in a ranked view (cheapest to most expensive)
- [ ] **COST-06**: Each practical cost scenario shows input/output token breakdown

### Model Detail

- [ ] **MDTL-01**: User can view a model detail page with current pricing (input/output/cache tiers)
- [ ] **MDTL-02**: User can see pricing history as a line chart showing price changes over time
- [ ] **MDTL-03**: User can see context window, model family, and release date on the detail page
- [ ] **MDTL-04**: User can see active free tier and promotion status on the detail page
- [ ] **MDTL-05**: User can see links to provider docs, API, and playground on the detail page
- [ ] **MDTL-06**: User can see recent mentions of the model in daily digests on the detail page

### Daily Content

- [ ] **CONT-01**: System auto-generates a daily article covering new model releases, pricing changes, promotions, and notable trends
- [ ] **CONT-02**: User can view a chronological archive of all past daily digests
- [ ] **CONT-03**: Each daily digest uses a scannable format: headline, key changes, pricing highlights, what to watch
- [ ] **CONT-04**: Daily article generation uses multi-provider AI (configurable — Claude, OpenAI, etc.)

### Intelligence

- [ ] **INTL-01**: User can view pricing trend charts showing price changes per model over time
- [ ] **INTL-02**: System highlights price drops and new model launches in trend data
- [ ] **INTL-03**: User can view a dedicated promotion/free tier tracker showing active promotions, beta trials, and free credits with expiration dates
- [ ] **INTL-04**: User can select 2-5 models for side-by-side multi-dimensional comparison (pricing, context window, practical cost, free tier status)
- [ ] **INTL-05**: User can set price threshold alerts for specific models (notify when price crosses threshold)

### Admin

- [ ] **ADMN-01**: Admin can view published daily articles and their source evidence
- [ ] **ADMN-02**: Admin can edit wrong information in published articles
- [ ] **ADMN-03**: Admin can rollback a published article to a previous version
- [ ] **ADMN-04**: Admin can mark a source as trusted or untrusted
- [ ] **ADMN-05**: Admin can manually trigger re-crawl for a specific provider
- [ ] **ADMN-06**: Admin can manually regenerate a daily article
- [ ] **ADMN-07**: Admin can disable auto-publish for low-confidence items
- [ ] **ADMN-08**: Admin dashboard shows pipeline health, job status, and error logs
- [ ] **ADMN-09**: Admin authentication via NextAuth.js (admin-only, no visitor accounts)

### Frontend

- [ ] **FRNT-01**: Public site is read-only — no visitor registration or user accounts
- [ ] **FRNT-02**: Site is built with Next.js 16 App Router with SSG for fast page loads
- [ ] **FRNT-03**: Site is responsive (works on mobile browsers)
- [ ] **FRNT-04**: All pages display "Last updated: [date]" for data freshness transparency

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Coverage

- **ECOV-01**: Embedding model pricing comparison
- **ECOV-02**: Fine-tuning cost comparison
- **ECOV-03**: Expand provider coverage beyond initial 30+

### Advanced Features

- **ADVF-01**: User-defined custom cost scenarios with adjustable token counts
- **ADVF-02**: Export comparison as shareable link or image
- **ADVF-03**: Email digest subscription for daily articles

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / registration | Site is read-only for visitors; admin-only auth |
| Real-time pricing updates | Daily batch is sufficient; real-time is 10x infrastructure cost |
| Model quality benchmarks / leaderboards | Different product; link to external sources instead |
| API gateway / model routing | OpenRouter's business model; show pricing, don't proxy |
| Interactive playground / chat | Every provider already has one; zero differentiation |
| Community features (comments, ratings) | Read-only model keeps focus; link to Reddit/Discord |
| Mobile app | Web-first; responsive design covers mobile browsers |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DCOL-01 | Phase 2 | Pending |
| DCOL-02 | Phase 2 | Pending |
| DCOL-03 | Phase 2 | Pending |
| DCOL-04 | Phase 2 | Pending |
| DCOL-05 | Phase 2 | Pending |
| DCOL-06 | Phase 1 | Pending |
| DCOL-07 | Phase 2 | Pending |
| PRIC-01 | Phase 3 | Pending |
| PRIC-02 | Phase 3 | Pending |
| PRIC-03 | Phase 3 | Pending |
| PRIC-04 | Phase 3 | Pending |
| PRIC-05 | Phase 3 | Pending |
| PRIC-06 | Phase 3 | Pending |
| COST-01 | Phase 4 | Pending |
| COST-02 | Phase 4 | Pending |
| COST-03 | Phase 4 | Pending |
| COST-04 | Phase 4 | Pending |
| COST-05 | Phase 4 | Pending |
| COST-06 | Phase 4 | Pending |
| MDTL-01 | Phase 5 | Pending |
| MDTL-02 | Phase 5 | Pending |
| MDTL-03 | Phase 5 | Pending |
| MDTL-04 | Phase 5 | Pending |
| MDTL-05 | Phase 5 | Pending |
| MDTL-06 | Phase 5 | Pending |
| CONT-01 | Phase 6 | Pending |
| CONT-02 | Phase 6 | Pending |
| CONT-03 | Phase 6 | Pending |
| CONT-04 | Phase 6 | Pending |
| INTL-01 | Phase 7 | Pending |
| INTL-02 | Phase 7 | Pending |
| INTL-03 | Phase 7 | Pending |
| INTL-04 | Phase 7 | Pending |
| INTL-05 | Phase 7 | Pending |
| ADMN-01 | Phase 8 | Pending |
| ADMN-02 | Phase 8 | Pending |
| ADMN-03 | Phase 8 | Pending |
| ADMN-04 | Phase 8 | Pending |
| ADMN-05 | Phase 8 | Pending |
| ADMN-06 | Phase 8 | Pending |
| ADMN-07 | Phase 8 | Pending |
| ADMN-08 | Phase 8 | Pending |
| ADMN-09 | Phase 8 | Pending |
| FRNT-01 | Phase 1 | Pending |
| FRNT-02 | Phase 1 | Pending |
| FRNT-03 | Phase 3 | Pending |
| FRNT-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44 (roadmap created)
- Unmapped: 0

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 after roadmap creation*
