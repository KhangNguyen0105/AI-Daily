---
phase: 02-data-collection-pipeline-revision
revision: 2.1
created: 2026-06-16T15:37:46.917+07:00
status: planning_complete
plans_created: 5
total_context: 118
---

# Phase 2.1 Planning Complete — Data Collection Pipeline Revision

## Overview

Phase 2.1 revision planning is complete with 5 sequential wave plans (02.1-01 through 02.1-05) addressing all 8 decision areas from the CONTEXT.md discussion phase.

**Planning Scope:** Transform Phase 2's basic implementation (12 providers, single-dimension confidence, no evidence anchoring) into a production-grade system supporting 30+ providers with multi-dimensional confidence scoring, evidence-first verification, freshness SLAs, and multi-source discovery.

---

## Wave Structure

| Wave | Plan | Focus | Dependencies | Estimated Effort |
|------|------|-------|--------------|------------------|
| 1 | 02.1-01 | Schema Foundation + Canonical Model Registry + Deduplication | None | 15-20 hours |
| 2 | 02.1-02 | Evidence Anchoring + Quote-Level Verification + Edge Cases | Wave 1 | 18-22 hours |
| 3 | 02.1-03 | Multi-Dimensional Confidence + Freshness SLAs | Wave 2 | 16-18 hours |
| 4 | 02.1-04 | Tier 1 Provider Expansion (10+) + Freshness Scheduling | Wave 3 | 20-24 hours |
| 5 | 02.1-05 | Tier 2/3 Providers (10+) + Multi-Source Discovery | Wave 4 | 18-22 hours |

**Total Estimated Effort:** 87-106 hours (Phase 2.1 execution)

**Execution Sequence:** Sequential waves (1→2→3→4→5). Each wave must complete before the next.

---

## Decision Coverage

### 1. Provider Coverage (DCOL-01) — WAVE 4, WAVE 5
- **Decision:** Tier-based expansion from 12 to 30+ providers
- **Wave 4:** Tier 1 (10 providers) — OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Moonshot/Kimi, MiniMax, Perplexity, Groq
- **Wave 5:** Tier 2 (7+ providers) + Tier 3+ (3+ providers)
- **Coverage:** ✅ Fully addressed with staged rollout strategy

### 2. Latest Model Discovery (DCOL-02) — WAVE 5
- **Decision:** Multi-source discovery (pricing pages + feeds + APIs + diffs)
- **Implementation:** Feed monitoring worker, API discovery via /models endpoints, diff-based change detection
- **Outcome:** Early model detection (announced status before pricing)
- **Coverage:** ✅ Fully addressed with 4-source pipeline

### 3. Data Freshness (FRNT-04) — WAVE 3, WAVE 5
- **Decision:** Multi-level freshness tracking with tiered SLAs
- **Wave 3:** Freshness confidence dimension, SLA thresholds (Tier 1: <24h, Tier 2: <48h, Tier 3+: <7d)
- **Wave 5:** SLA enforcement scheduling (Tier 1: every 4 hours, Tier 2: every 12 hours, Tier 3+: daily)
- **Coverage:** ✅ Fully addressed with per-tier tracking and SLA enforcement

### 4. Deduplication Strategy (DCOL-06) — WAVE 1, WAVE 4
- **Decision:** Hybrid canonical registry with provider ID priority + fuzzy matching candidates
- **Wave 1:** CanonicalRegistry class, weighted matching algorithm, review queue for ambiguous matches
- **Wave 4:** All Tier 1 adapters register with canonical registry using provider model IDs
- **Coverage:** ✅ Fully addressed with provider ID prioritization and no auto-merge below 85%

### 5. Model Normalization (DCOL-02) — WAVE 1, WAVE 4
- **Decision:** Dual-layer pricing (preserve raw + normalized) with normalization confidence
- **Wave 1:** Schema supports raw_price_text, raw_unit, raw_currency, raw_billing_model + normalized fields
- **Wave 4:** All adapters store both layers
- **Coverage:** ✅ Fully addressed with transparency preserved

### 6. Extraction Accuracy (DCOL-02) — WAVE 2
- **Decision:** Evidence-first verification (quote-level anchoring, numeric tolerance rules, hallucination prevention)
- **Wave 2:** Evidence anchoring schema + quote-level verification + large-change detection
- **Coverage:** ✅ Fully addressed via evidence-first architecture

### 7. Confidence Scoring System (DCOL-04) — WAVE 3
- **Decision:** Multi-dimensional scoring (6 independent dimensions) with per-field confidence
- **Wave 3:** source/extraction/normalization/verification/freshness/overall + per-field confidence
- **UI Impact:** Tooltip breakdown explains each dimension, human override supported
- **Coverage:** ✅ Fully addressed with explainable, multi-dimensional scores

### 8. Verification Pipeline (DCOL-07) — WAVE 2, WAVE 3
- **Decision:** Evidence-anchored, multi-pass, edge-case aware verification
- **Wave 2:** Evidence anchoring, quote-level validation, edge-case classification
- **Wave 3:** Verification confidence dimension, hallucination prevention
- **Coverage:** ✅ Fully addressed with quote anchoring + edge-case handling

---

## Key Dependencies & Sequencing

```
Wave 1 (Schema + Registry)
├─ canonical_models table + pricing_history + dedup logic
└─ Ready for: Wave 2

Wave 2 (Evidence + Verification)
├─ evidence_quotes JSONB + verification_status enum
├─ Quote-level validation + edge-case classifier
└─ Ready for: Wave 3

Wave 3 (Confidence + Freshness)
├─ Multi-dimensional confidence scoring
├─ Freshness SLA enforcement
├─ Pricing API returns confidence breakdown
└─ Ready for: Wave 4

Wave 4 (Tier 1 Providers)
├─ 10 Tier 1 adapters with evidence anchoring
├─ Canonical registry integration
├─ 4-hour refresh scheduling
└─ Ready for: Wave 5

Wave 5 (Tier 2+ + Discovery)
├─ 10+ Tier 2/3 adapters
├─ Feed monitoring worker
├─ Diff-based change detection
└─ Phase 2.1 COMPLETE
```

**Critical Path:** Wave 1 → Wave 2 → Wave 3 → (Wave 4 parallel Wave 5 after Wave 3)

**Parallel Execution Opportunity:** Waves 4 and 5 could theoretically run in parallel after Wave 3 completes, but Wave 4 (Tier 1) should complete first for stability.

---

## Files Modified/Created

### Schema (Drizzle ORM)
- **src/db/schema.ts** — Add: canonical_models, pricing_history, model_status_audit, discovered_models, model_status_events tables; extend extractions with evidence/freshness/normalization/verification fields

### Provider Infrastructure
- **src/providers/registry.ts** — TIER1_PROVIDERS, TIER2_PROVIDERS, TIER3_PROVIDERS lists; registry methods
- **src/providers/base.ts** — Update ProviderAdapter interface with evidence_quotes, raw_pricing fields
- **src/providers/{moonshot,minimax,kimi,openrouter,nebius,sambanova,lepton,replicate,huggingface,...}/adapter.ts** — New/enhanced adapters (Wave 4-5)

### Pipeline Logic
- **src/lib/canonical-registry.ts** — NEW: CanonicalRegistry class (Wave 1)
- **src/lib/deduplication.ts** — NEW: Dedup matching + review queue (Wave 1)
- **src/lib/evidence-anchor.ts** — NEW: Evidence capture + validation (Wave 2)
- **src/pipeline/edge-case-classifier.ts** — NEW: Edge-case detection (Wave 2)
- **src/pipeline/verification.ts** — ENHANCE: Quote-level verification + numeric tolerance (Wave 2)
- **src/pipeline/confidence.ts** — REDESIGN: 6-dimensional scoring (Wave 3)
- **src/lib/freshness-tracker.ts** — NEW: Freshness SLA enforcement (Wave 3)
- **src/pipeline/feed-monitor-worker.ts** — NEW: Feed monitoring + API discovery (Wave 5)
- **src/pipeline/scheduler.ts** — ENHANCE: Tier 1/2/3 scheduling (Wave 4-5)

### Workers
- **src/pipeline/workers/extract.ts** — Add evidence capture (Wave 2)
- **src/pipeline/workers/score.ts** — Add multi-dimensional confidence calculation (Wave 3)
- **src/pipeline/workers/dedup.ts** — NEW: Dedup worker (Wave 1)
- **src/pipeline/worker-entry.ts** — Register new workers and schedulers

### API
- **src/app/api/pricing/route.ts** — Enhance response with confidence breakdown (Wave 3)

---

## Requirements Coverage

| Requirement | Waves | Status |
|-------------|-------|--------|
| DCOL-01 (30+ providers) | 4, 5 | ✅ Addressed |
| DCOL-02 (AI extraction + discovery) | 2, 5 | ✅ Addressed |
| DCOL-03 (Raw URLs + evidence) | 2 | ✅ Addressed |
| DCOL-04 (Confidence scores) | 3 | ✅ Addressed |
| DCOL-05 (Daily schedule) | 4, 5 | ✅ Addressed (via BullMQ scheduling) |
| DCOL-06 (Provider pattern) | 1, 4 | ✅ Addressed |
| DCOL-07 (Two-pass verification) | 2, 3 | ✅ Addressed |
| FRNT-04 (Freshness display) | 3 | ✅ Addressed |

---

## Testing Strategy

### Wave 1 Tests
- CanonicalRegistry: register, resolve, addAlias, recordRename, getLineage (8+ tests)
- Deduplication: detectDuplicates with varying match scores, confidence thresholds (10+ tests)
- Schema migration: ensure all tables created with correct constraints

### Wave 2 Tests
- Evidence capture: find text in HTML, extract context, generate selectors (8+ tests)
- Quote validation: exact match, case-insensitive, punctuation variations
- Numeric tolerance: same-unit ±0.1%, converted-unit ±0.5%, large changes <0.05% (6+ tests)
- Edge-case classification: all 14 edge case types detected (8+ tests)

### Wave 3 Tests
- Confidence dimensions: source/extraction/normalization/verification/freshness/overall (8+ tests)
- Freshness status: fresh/recent/aging/stale mapped correctly
- SLA breach detection: Tier1 >24h, Tier2 >48h, Tier3+ >7d (6+ tests)
- Per-field confidence: each critical field tracked independently
- Human override: machine score preserved, override applied correctly

### Wave 4 Tests
- Tier 1 adapters: each provider crawls, extracts, registers with canonical registry (10 provider tests)
- Evidence anchoring: each adapter captures evidence_quotes, raw_pricing fields (10 tests)
- Provider model IDs: API discovery returns correct model list, matches canonical registry (5+ tests)
- Scheduling: Tier 1 refresh job runs every 4 hours, enqueues all 10 adapters (2 tests)

### Wave 5 Tests
- Feed monitoring: detects new models, parses feeds, stores announced status (4+ tests)
- API discovery: queries provider /models endpoints, matches against registry (3+ tests)
- Diff detection: finds new/renamed/deprecated models, flags price changes >20% (4+ tests)
- Tier 2/3 adapters: each provider basic implementation (3+ provider tests)
- Scheduling: Tier 2 every 12 hours, Tier 3+ daily, feed monitoring before main orchestrator

**Total Unit Tests:** 80-100 (across all waves)

---

## Success Verification

### End-of-Phase Gate (after Wave 5)

**Must-Have Achievements:**
- [ ] All 8 decision areas fully implemented and working
- [ ] 30+ providers registered (10 Tier 1 + 7+ Tier 2 + 3+ Tier 3)
- [ ] Evidence anchoring: 100% of extractions have evidence_quote + evidence_selector
- [ ] Canonical model registry: zero duplicate canonical models across all providers
- [ ] Confidence scoring: all extractions have source/extraction/normalization/verification/freshness/overall scores
- [ ] Freshness SLAs: Tier 1 <24h, Tier 2 <48h, Tier 3+ <7d, SLA breaches trigger alerts
- [ ] Multi-source discovery: pricing pages + feeds + APIs + diffs all operational
- [ ] Pricing table displays confidence tooltip, freshness badge, edge-case warnings
- [ ] No quarantined extractions reach public UI
- [ ] Zero hallucinated prices (evidence-anchored verification prevents fabrication)

**Behavioral Spot-Checks:**
- New Tier 1 model detected in feed → stored as announced → pricing found on next crawl → auto-links to canonical registry
- Price change >20% → triggers stronger verification → requires evidence quote → flagged in admin dashboard
- Tier 1 provider not crawled for >24h → SLA breach alert → priority recrawl triggered
- Low-confidence extraction → marked in UI with warning icon → excluded from "best price" ranking
- Human admin overrides confidence score → both machine score and override stored → audit trail preserved

---

## Known Open Questions (for execution)

1. **Manual Review Capacity:** How many low-confidence extractions can admin review per day? Should Wave 2 set up a review queue dashboard?
2. **Feed Coverage:** Which providers have RSS/changelog feeds? Should Wave 5 include scraping detection if feed parsing fails?
3. **API Key Management:** Do Tier 2+ providers require API keys for /models endpoints? Should secrets be stored in .env or secrets manager?
4. **Consensus Verification (Pass C):** For high-stakes price changes, should Pass C use different LLM (Claude vs OpenAI)? Cost implications?
5. **Historical Snapshot Retention:** How far back should raw_html_snapshot be retained? Weekly cleanup? Frequency?
6. **Regional Pricing:** How should region-specific pricing be handled? Store per-region or edge-case flag?

---

## Phase 2.1 vs Phase 2: Changes

**Phase 2 (Original — 116/116 tests pass):**
- 12 providers, basic confidence (verified/likely/low-confidence), two-pass verification, daily schedule

**Phase 2.1 (Revision):**
- 30+ providers (staged: Tier 1 → Tier 2 → Tier 3)
- Multi-dimensional confidence (6 dimensions + per-field)
- Evidence-first verification (quote anchoring + numeric tolerance rules)
- Multi-source discovery (feeds + APIs + diffs)
- Freshness SLAs (tiered per provider)
- Deduplication with canonical registry (provider model ID priority)
- Human-in-the-loop confidence overrides
- Edge-case classification (free tiers, tiered pricing, etc.)

**Backward Compatibility:**
- Existing extractions continue to work (freshness = NOW(), confidence computed retroactively)
- Existing adapters enhanced (not rewritten); evidence anchoring is additive
- BullMQ queue structure unchanged; new workers added without disrupting existing pipeline

---

## Next Steps

**For Execution Phase:**
1. Read execute-plan orchestrator workflow
2. Execute Wave 1 first (schema + registry foundation)
3. Verify Wave 1 before starting Wave 2
4. Execute Waves 2-3 sequentially
5. Execute Wave 4 (Tier 1 providers)
6. Execute Wave 5 (Tier 2+ + discovery)
7. Run full test suite (80-100 tests)
8. Manual verification (pricing table displays correctly, SLA alerts work, evidence quote clickable)
9. Deploy to staging; smoke test with live provider crawls
10. Deploy to production; monitor for first 24 hours

**Estimated Execution Time:** 5-7 days (with 2-3 developers or 1 developer working full-time)

---

## Appendix: Decision-to-Wave Mapping

| Decision | Area | Wave | Key Files |
|----------|------|------|-----------|
| D-01 | Provider Coverage | 4, 5 | registry.ts, orchestrator.ts, 15+ adapters |
| D-02 | Model Discovery | 5 | feed-monitor-worker.ts, discovered_models table |
| D-03 | Data Freshness | 3, 5 | freshness-tracker.ts, scheduler.ts, SLA_TIERS |
| D-04 | Deduplication | 1, 4 | canonical-registry.ts, deduplication.ts, adapter register() |
| D-05 | Normalization | 1, 4 | schema.ts (raw_price_text, etc.), all adapters |
| D-06 | Provider Pattern | 1, 4 | base.ts, ProviderAdapter interface, registry |
| D-07 | Confidence Scoring | 3 | confidence.ts (redesigned), per_field_confidence |
| D-08 | Verification Pipeline | 2, 3 | evidence-anchor.ts, verification.ts, edge-case-classifier.ts |

---

*Planning completed: 2026-06-16T15:37:46Z*
*Status: Ready for execution*
*All 8 decision areas covered across 5 sequential waves*
