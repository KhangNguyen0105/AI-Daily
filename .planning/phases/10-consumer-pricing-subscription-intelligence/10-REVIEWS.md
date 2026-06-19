---
phase: 10
reviewers: [codex, antigravity]
reviewed_at: 2026-06-19T12:00:00Z
plans_reviewed:
  - 10-01-PLAN.md
  - 10-02-PLAN.md
  - 10-03-PLAN.md
---

# Cross-AI Plan Review — Phase 10

## Codex Review

### Summary

The three plans are coherent and mostly well sequenced: Plan 01 establishes the data model and adapter surface, Plan 02 adds provider coverage and pipeline persistence, Plan 03 exposes the data in the UI. The approach reuses existing crawling, extraction, Drizzle, and card-grid patterns, which is the right bias for this phase. The main risks are around extraction reliability for consumer subscription pages, schema precision for pricing/trial variants, promotion mapping semantics, and operational safety when adding 10 new dynamic web sources to the daily pipeline.

### Strengths

- Clear dependency ordering: schema and adapter abstractions precede concrete adapters, persistence, and UI.
- Separate `subscription_plans` table is a good choice; consumer subscriptions have different lifecycle and fields than API pricing or promotions.
- Dedicated consumer adapter registry avoids forcing consumer products into API-provider semantics.
- `free_trial` as a distinct promotion type is correct; it avoids conflating perpetual free tiers with time-limited trials.
- Tiered provider coverage matches the success criteria while leaving room for best-effort expansion beyond the required 5.
- UI plan is appropriately scoped: dedicated `/subscriptions` page plus trial surfacing on `/promotions`.
- Testing is included early, especially schema and enum coverage.

### Concerns

- **HIGH: Plan 02 may overcommit to 10 adapters in one phase without source-specific extraction safeguards.** Consumer pricing pages often vary by geography, logged-in state, cookies, A/B tests, account type, and bundled plans. A generic `generateObject()` pattern may produce unstable or hallucinated data unless each adapter has strong source constraints and validation.

- **HIGH: Schema may be insufficient for multi-plan, multi-currency, and bundled pricing.** Fields like `monthly_price`, `annual_price`, and `annual_monthly_price` assume simple numeric pricing. Providers may show regional pricing, family/student tiers, monthly credits, included bundles, or "from $X" language. The plan does not mention nullable behavior, decimal precision, price units, or how to represent unavailable/ambiguous prices.

- **HIGH: `UNIQUE(source_id, plan_name)` is likely fragile.** Plan names can change slightly, be localized, or collide across variants such as "Pro monthly" and "Pro annual". It also does not account for region/currency if those are ever added. At minimum, the plan needs normalization rules.

- **MEDIUM: Promotion mapping from subscription trials may duplicate or blur data ownership.** Surfacing subscription trials on `/promotions` is good, but the plan should define whether these are virtual rows from `subscription_plans` or materialized rows in `promotions`. Mixing both could create duplicates or inconsistent expiration behavior.

- **MEDIUM: Missing confidence and provenance handling.** The project already emphasizes AI-powered extraction, confidence scoring, and safety controls. The subscription schema and persistence plan do not mention extraction confidence, raw evidence snippets, last verified status, or review flags.

- **MEDIUM: Pipeline priority alone may not be enough.** Adding 10 Playwright-based adapters can increase crawl time and failure rate. The plan does not mention per-adapter timeouts, retry policy, rate limits, failure isolation, or partial-success reporting.

- **MEDIUM: UI filters may not match the actual data model.** "Monthly" and "Annual" filters need clear semantics: plans that have monthly pricing, annual pricing, both, or annual-only. "Free Trial Available" should handle `free_trial_days > 0` and possibly textual trials where duration is unknown.

- **MEDIUM: Dates are underspecified.** `start_date` and `end_date` are listed, but many subscription plans do not have explicit validity windows. The plan should define whether these are plan validity dates, trial campaign dates, promotion dates, or null unless explicitly published.

- **LOW: Test plan is schema-heavy but light on pipeline behavior.** There are no explicit tests for worker upsert behavior, promotion projection, adapter failure handling, or UI filtering/sorting.

- **LOW: Navigation change is straightforward but should account for responsive/mobile nav if one exists.**

### Suggestions

- Add a `confidence`, `extraction_notes` or `evidence`, and `status` field to subscription extraction results, or explicitly reuse an existing confidence/audit mechanism if one exists.

- Define exact numeric types and nullability for pricing:
  - `monthly_price` nullable decimal
  - `annual_price` nullable decimal
  - `annual_monthly_price` nullable decimal or derived
  - `currency` required when any price exists
  - preserve ambiguous price text in a separate field if existing patterns support it

- Reconsider the unique key. Better options:
  - `UNIQUE(source_id, provider_name, plan_name, currency)`
  - or introduce a stable `plan_slug` generated by adapter normalization
  - include `billing_period` only if monthly and annual variants are separate rows

- Add clear normalization rules for plan names, prices, trial durations, and feature lists. This matters because AI extraction can otherwise produce unstable diffs on every crawl.

- For Plan 02, require each adapter to provide:
  - canonical source URL
  - provider name
  - expected plan names where known
  - extraction prompt/source constraints
  - adapter-level timeout
  - graceful empty result behavior
  - logging on confidence below threshold

- Add pipeline tests for:
  - subscription upsert insert/update
  - duplicate plan handling
  - failed consumer adapter does not fail the whole daily run
  - free trial projection onto promotions page
  - `free_trial` enum compatibility

- Clarify whether `/promotions` reads subscription trials directly from `subscription_plans` or writes synthetic `promotions` rows. I would prefer direct projection at query/view-model level for v1 to avoid duplicate persistence.

- Add an explicit "unknown price" UI state. Some plans may say "contact sales", "included with Google One AI Premium", or show price only after region detection.

- Include source freshness on cards, such as `crawled_at` or "last checked", especially because consumer prices and trials change frequently.

- Consider delivering Tier 1 adapters first, with Tier 2 behind a best-effort flag or lower-priority queue. This still satisfies the phase success criteria and reduces launch risk.

### Risk Assessment

**Overall risk: MEDIUM.**

The architecture is sound and aligned with existing project patterns, but the data quality risk is significant. Consumer subscription pages are less structured than API pricing docs and are more likely to vary by region, account state, and marketing campaign. The phase is achievable if the implementation adds strong extraction validation, confidence handling, failure isolation, and clear normalization rules. Without those, the UI may ship successfully while displaying unstable or misleading subscription data.

---

## Antigravity Review

> ⚠️ Antigravity CLI returned empty output (Windows stdout bug — transcript was empty). No review produced.

---

## Consensus Summary

> Based on 1 of 2 reviewers (antigravity failed).

### Agreed Strengths

- Clear dependency ordering across the three plans (schema → adapters → UI)
- Separate `subscription_plans` table is the right architectural choice
- `free_trial` as distinct from `free_tier` is semantically correct
- Reuses existing patterns (ProviderAdapter, PromotionsPageClient, Drizzle upsert)

### Agreed Concerns

- **Extraction reliability for consumer pages** — Consumer subscription pages are marketing pages with complex layouts, A/B tests, regional variations. Generic `generateObject()` may produce unstable data.
- **Unique key fragility** — `UNIQUE(source_id, plan_name)` may break on plan name variations, localization, or billing period variants.
- **Missing confidence/provenance** — Subscription extraction doesn't include confidence scoring or raw evidence storage, unlike the existing API extraction pipeline.
- **Promotion mapping ambiguity** — Plan 03 projects subscription trials onto `/promotions` but doesn't clarify whether this is virtual (query-time) or materialized (written to promotions table).

### Divergent Views

- (Only 1 reviewer available — no divergent views to report)
