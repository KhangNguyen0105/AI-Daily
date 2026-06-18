---
phase: 02-data-collection-pipeline
revision: 2.1
created: 2026-06-16T15:17:26.260+07:00
context_type: phase-revision
status: active
---

# Phase 2.1: Data Collection Pipeline Revision — Context & Decisions

## Objective

Redesign Phase 2 to improve data quality across 8 critical dimensions before re-executing. Current implementation covers 12 providers with basic confidence scoring; Phase 2.1 targets 30+ providers with multi-layered verification, evidence-first validation, and detailed freshness tracking.

**This is a REVISION, not a retrospective:** Decisions made here will inform replanning Phase 2.

---

## 1. Provider Coverage (DCOL-01)

### Current State
- 12 providers implemented: OpenAI, Anthropic, Google, Mistral, Cohere, Groq, Together, Perplexity, xAI, Fireworks, DeepSeek, Bedrock
- Requirement specifies "30+ providers"

### Decision: Tiered Provider Expansion

**Tier 1 (Critical — highest business value and pricing transparency):**
- OpenAI, Anthropic, Google, Mistral, Cohere, xAI, Perplexity, DeepSeek, Moonshot/Kimi, MiniMax

**Tier 2 (Major — API-first, widely used):**
- OpenRouter, Together, Fireworks, Groq, Nebius, SambaNova, Lepton

**Tier 3 (Enterprise/Cloud):**
- Azure OpenAI, Vertex AI, Amazon Bedrock

**Tier 4 (Specialized — compute platforms):**
- Replicate, Hugging Face, Baseten, OctoAI, Anyscale

**Tier 5 (International & emerging):**
- Alibaba, Baidu, Tencent, NVIDIA NIM, Cerebras, Writer, AI21, Liquid AI

**Prioritization Rule:** Expand in order of business importance and pricing transparency. Total target: 30+ providers across all tiers. Do not add providers without official pricing pages or API documentation.

---

## 2. Latest Model Discovery (DCOL-02)

### Current State
- Single discovery method: scrape provider pricing pages during collect cycle
- No early signal detection for announcements or model renames

### Decision: Multi-Source Discovery Strategy

**Discovery Pipeline (Priority order):**

1. **Scrape provider pricing pages** (canonical source)
   - Canonical pricing data source
   - Store raw HTML/JSON snapshots for auditability
   - Run on scheduled collect cycle

2. **Monitor official feeds** (early signals)
   - Changelog pages: OpenAI changelog, Anthropic news, Google AI releases
   - Blog/RSS feeds: provider release announcements
   - Release notes: documentation systems
   - Mark detected models as `announced` or `pricing_pending` until price verified

3. **Query provider APIs** (strong identity signals)
   - Use `/models` or `/list` endpoints where available
   - Compare API model IDs against canonical registry
   - Store provider model ID as authoritative key
   - Treat API discovery as high-confidence identity signal

4. **Diff-based discovery** (change detection)
   - Keep previous crawl snapshots
   - Run structured diffs against pricing pages and APIs
   - Flag: new models, renamed models, changed context windows, price changes, deprecated models

5. **Freshness cadence** (tiered collection)
   - Tier 1 providers: every 2-4 hours
   - Tier 2 providers: every 6-12 hours
   - Tier 3+ providers: daily
   - Emergency recrawl: manual trigger from admin dashboard

**Model Lifecycle Statuses:**
- `announced` — model detected in feeds/APIs, awaiting pricing
- `pricing_pending` — pricing not yet found
- `verified` — pricing confirmed from pricing page
- `deprecated` — provider officially retired
- `replaced` — superseded by newer version
- `quarantined` — extraction conflict or hallucination detected

**Critical Rule:** Never hallucinate pricing. If model is detected but pricing is missing, show `pricing_pending` instead of inventing values.

---

## 3. Data Freshness (FRNT-04)

### Current State
- Single global "last updated" timestamp
- No per-provider or per-model freshness tracking
- No freshness SLA enforcement

### Decision: Multi-Level Freshness Tracking & SLAs

**Display Freshness At Multiple Levels:**
- Global dataset timestamp
- Provider last-updated timestamp
- Model last-verified timestamp
- Every pricing row shows: last-verified timestamp + freshness badge

**Freshness Status Badges:**
- Fresh: <24 hours (green)
- Recent: 24-72 hours (blue)
- Aging: 3-7 days (amber)
- Stale: >7 days (red)

**Tiered Freshness SLA:**

| Tier | Providers | Crawl Frequency | Freshness SLA | Badge Threshold |
|------|-----------|-----------------|----------------|-----------------|
| Tier 1 | OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral | Every 2-4 hours | <24 hours | Stale >24h |
| Tier 2 | Cohere, Perplexity, Groq, Together, Fireworks, OpenRouter | Every 6-12 hours | <48 hours | Stale >48h |
| Tier 3+ | All others | Daily | <7 days | Stale >7d |

**Freshness in Confidence Calculation:**
- Verified + Fresh (<24h) → Highest confidence
- Verified + Aging (3-7d) → Confidence penalty
- Verified + Stale (>7d) → Significant confidence reduction

**Hard Stale Thresholds:**
- >14 days stale: Show warning banner on pricing table
- >30 days stale: Exclude from ranking calculations by default; show "Stale" warning; keep visible
- Never hide stale data silently

**Automatic Actions on SLA Breach:**
- Trigger priority recrawl
- Generate admin alert
- Log freshness incident
- After repeated failures: mark provider as degraded, surface warning in admin dashboard

**Store Pricing History:** Never overwrite pricing in place. Each crawl snapshot is append-only. Preserve historical context to explain when and why prices changed.

---

## 4. Deduplication Strategy (DCOL-06)

### Current State
- Adapters normalize within their own extraction
- No cross-provider duplicate detection
- No canonical model registry

### Decision: Hybrid Canonical Registry Architecture

**Priority Order (use all three, don't rely on any single source):**

1. **Canonical Model Registry** (source of truth)
   - Create `canonical_models` table with:
     - `canonical_id` (UUID, immutable)
     - `canonical_name` (e.g., "GPT-4o")
     - `provider`
     - `family` (e.g., "gpt-4 family")
     - `aliases[]` (e.g., ["gpt-4o", "gpt-4o-2024-08-06", "GPT 4o"])
     - `api_model_ids[]` (e.g., ["gpt-4o" from OpenAI API])
     - `status` (announced/active/deprecated/replaced/quarantined)
     - `first_seen`, `last_seen`, `lineage` (tracks GPT-4 → GPT-4 Turbo → GPT-4o)

2. **Provider API Model IDs** (highest-confidence matching)
   - Store raw provider model IDs
   - Use `provider + model_id` as strongest identity signal
   - Example: `(provider="openai", model_id="gpt-4o")` → auto-maps to canonical registry
   - Prioritize: OpenAI, Anthropic, Google, Mistral, Cohere

3. **Alias Resolution Layer** (identity normalization)
   - Maintain alias mappings: `gpt-4-turbo-preview` → GPT-4 Turbo
   - Keep aliases searchable but resolve to one canonical model
   - Track deprecation timeline

4. **Controlled Fuzzy Matching** (candidate discovery only)
   - Use fuzzy matching only for candidates, never auto-merge
   - Workflow: Unknown model → Fuzzy match candidate → Confidence score
   - If confidence below threshold: route to manual review queue

**Duplicate Detection Signals** (weighted matching):
- Provider model ID match → highest weight
- Canonical registry alias match
- Exact normalized name match
- Family match + context window match
- Pricing similarity
- **Generate duplicate confidence score**
- High confidence (>85%): auto-link
- Medium confidence (55-84%): review queue
- Low confidence (<55%): new model candidate

**Model Rename Handling:**
- Preserve canonical identity through renames
- Add previous identifier as alias
- Example: Provider changes `claude-3-5-sonnet` → `claude-sonnet-4` but canonical ID remains same; old name added as alias

**Never Delete Models:** Track full lineage and lifecycle.

---

## 5. Model Normalization (DCOL-02)

### Current State
- Normalize all prices to per-1M tokens
- Store normalized values in database
- Discard raw provider formats

### Decision: Dual-Layer Pricing Normalization

**Layer 1: Store Raw Provider Pricing (required for transparency)**

Every price record must preserve original:
- `raw_price_text` — exact text from provider
- `raw_unit` — original unit ("per 1K tokens", "$20/month", "tiered", etc.)
- `raw_currency` — original currency
- `raw_billing_model` — how provider bills (token-based, fixed, tiered, etc.)
- `raw_tier_rules` — any tier-specific rules
- `raw_source_url` — where it came from
- `raw_effective_date` — when it became effective
- `raw_extracted_at` — extraction timestamp

**Layer 2: Normalize Token-Based Pricing**

For token-based models, normalize to:
- `input_usd_per_1m_tokens`
- `output_usd_per_1m_tokens`
- `cached_input_usd_per_1m_tokens` (if applicable)
- `reasoning_usd_per_1m_tokens` (if applicable)

Supported raw units for conversion:
- per 1 token
- per 1K tokens
- per 1M tokens / MTok
- per character (only if safely convertible)
- per image/audio/video unit (stored separately, not converted)

**Add Explicit `pricing_model_type`:**
Each price record must have:
- `token_usage` — standard token-based pricing
- `request_based` — per-request fixed price
- `fixed_monthly` — monthly subscription
- `tiered_usage` — tiered token-based pricing
- `credit_based` — credit system
- `free_quota` — free tier
- `enterprise_only` — contact sales
- `unknown` — cannot classify

**Add Normalization Confidence Score:**
- `normalization_confidence` (high/medium/low/unknown)
- `normalization_notes` (e.g., "arithmetic conversion from per-1K to per-1M")
- `normalization_warnings` (e.g., "tiered pricing not representable as flat rate")

Examples:
- High: "$3 / 1M input tokens" → direct conversion
- Medium: "$0.003 / 1K tokens" → arithmetic conversion
- Low: "$20/month" → non-token plan, not comparable as token price
- Unknown: "contact sales" → enterprise_only / unknown

**Track Pricing Model Changes Over Time:**
- Store history as append-only records
- Never overwrite old pricing
- Track signals: token price changed, unit changed, tiered pricing added, free tier deprecated, etc.

**UI Behavior for Non-Token Pricing:**

*Pricing Comparison Table:*
- Token-based models: Show normalized per-1M token price; show raw format in tooltip
- Non-token-based: Do NOT fake a per-1M token price; show badge (Monthly plan / Per request / Tiered / Free quota / Enterprise only / Pricing unknown)
- In price columns, display: "N/A" / "Plan-based" / "Tiered" / "Contact sales"
- These rows filterable but excluded from cheapest-token rankings

*Detail Pages:*
- Show both normalized comparable price AND original provider pricing text
- Example: Comparable: $3.00/1M input; Original: $0.003/1K tokens

*Cost Calculator:*
- Only include models with token pricing + medium/high normalization confidence
- Non-token-based: exclude by default; allow opt-in "show non-comparable"
- Explain why non-comparable pricing cannot be safely estimated

---

## 6. Extraction Accuracy (DCOL-02)

### Current State
- LLM extraction with Vercel AI SDK `generateObject()`
- Two-pass verification with 0.1% tolerance
- No quote-level evidence linking

### Covered By: Verification Pipeline section (see section 8)

Evidence-first verification and quote-level evidence linking directly address accuracy concerns.

---

## 7. Confidence Scoring System

### Current State
- Single confidence level: verified / likely / low-confidence
- Based on source tier, field completeness, and verification

### Decision: Layered Multi-Dimensional Confidence

**Internal Scoring (0-100 scale):**
- Internally compute 0-100 score
- UI displays simple labels based on ranges:
  - Verified: 90-100
  - High: 75-89
  - Medium: 55-74
  - Low: 30-54
  - Quarantined: <30

**Separate Confidence Dimensions** (do NOT use one generic score):
- `source_confidence` — quality of source document
- `extraction_confidence` — quality of LLM extraction
- `normalization_confidence` — quality of unit/currency conversion
- `freshness_confidence` — age of data
- `verification_confidence` — strength of verification check
- `overall_confidence` — weighted combination

Example breakdown:
- Official pricing page found → source_confidence = high (85)
- LLM extracted price from messy table → extraction_confidence = medium (65)
- Unit converted from per-1K to per-1M → normalization_confidence = high (80)
- Last verified 9 days ago → freshness_confidence = low (40)
- Second-pass verification matched → verification_confidence = high (85)

**Per-Field Confidence** (critical fields):
- `model_name_confidence`
- `provider_confidence`
- `input_price_confidence`
- `output_price_confidence`
- `context_window_confidence`
- `currency_confidence`
- `pricing_unit_confidence`
- `free_tier_confidence`
- `source_url_confidence`

One row can have reliable model identity (high) but uncertain context window (low).

**Weighted Overall Confidence** (suggested weights):
- source_confidence: 25%
- extraction_confidence: 25%
- normalization_confidence: 20%
- verification_confidence: 20%
- freshness_confidence: 10%

**Critical Rules for Overall Confidence:**
- If input_price or output_price is low-confidence → overall cannot exceed Medium
- If source is unofficial → overall cannot exceed Medium (unless manually reviewed)
- If verification disagreement detected → record quarantined

**Human-in-the-Loop Adjustment:**
- Add admin override fields: `human_review_status`, `reviewed_by`, `reviewed_at`, `human_confidence_override`, `review_notes`
- Statuses: unreviewed / approved / corrected / rejected / quarantined
- Manual review sits on top of machine scores, does not erase them

**Confidence Effects in UI:**

*Pricing Table:*
- Show simple confidence badge
- Tooltip shows breakdown: Source / Extraction / Normalization / Freshness / Verification
- Low-confidence rows: visible but visually muted, warning icon, excluded from "best price" highlight
- Quarantined rows: hidden by default; visible only in admin/debug mode
- Stale freshness: show stale warning even if other confidence is high

*Ranking:*
- Default ranking uses only: Verified / High / Medium
- Low-confidence rows: excluded by default; optional "include low-confidence" toggle
- Quarantined rows: never ranked

*Cost Calculator:*
- Only use rows with price_confidence >= Medium AND normalization_confidence >= Medium AND freshness not older than hard threshold
- Show explanation if excluded: "Excluded because pricing is low-confidence or stale"

**Confidence History:** Track score changes over time to detect provider page changes, parser degradation, model disappearance, extraction uncertainty drift.

---

## 8. Verification Pipeline (DCOL-07)

### Current State
- Two-pass verification with 0.1% numeric tolerance
- No quote-level evidence linking
- No edge-case handling
- Basic LLM disagreement detection

### Decision: Evidence-First, Multi-Pass Verification

**1. Evidence Anchoring (REQUIRED)**

Every extracted price must include evidence:
- `source_url` — where it came from
- `raw_html_snapshot_id` — reference to stored HTML snapshot
- `extracted_text_snippet` — context around the price
- `evidence_quote` — exact text supporting the value
- `evidence_selector` — CSS selector or XPath if available
- `evidence_hash` — hash of snippet for audit trail
- `extracted_at` — timestamp

**Rule:** No price is verified unless anchored to specific source snippet. Admin can always click from a pricing row to exact evidence.

**2. Quote-Level Evidence For Every Important Field:**
- model_name: evidence quote
- input_price: evidence quote
- output_price: evidence quote
- context_window: evidence quote
- currency: evidence quote
- pricing_unit: evidence quote
- free_tier: evidence quote
- effective_date: evidence quote

**3. Multi-Pass Verification** (minimum 2 passes; optional 3rd for high-stakes):

| Pass | Purpose | Method | When to Use |
|------|---------|--------|------------|
| A | Extract structured pricing | Parse provider source, extract fields | Every extraction |
| B | Verify extracted values against source | Re-read source text, confirm quotes match | Every extraction |
| C | Independent verification | Alternative LLM or manual review | New models, large price changes, low-confidence, tiered pricing, conflicting evidence |

Do NOT use 3-LLM consensus for everything (cost/latency). Use selectively.

**4. Numeric Tolerance Rules** (unit-aware comparison):

After normalization to comparable units:
- Direct same-unit comparison: ±0.1% tolerance
- Converted unit comparison: ±0.5% tolerance (accounts for FX rounding, per-K vs per-M arithmetic)
- Currency conversion: depends on FX source/date (store FX rate used)
- Tiered/plan pricing: do NOT compare as flat token pricing

Examples of equivalent:
- $0.003 / 1K tokens = $3 / 1M tokens ✓
- $3 input = $3 output ✗

**5. Edge-Case Detection** (explicit classification):

Explicitly detect and classify; do NOT force into normal fields:
- free_tiers
- free_trial_credits
- cached_input_pricing
- batch_discounts
- reasoning_tokens
- image/audio/video_pricing
- per_request_pricing
- monthly_plans
- enterprise_only_pricing
- contact_sales_pricing
- region_specific_pricing
- deprecated_models
- promotional_pricing
- fine_tuning_pricing
- embedding_pricing

**6. Conflict Handling:**

If extraction and verification disagree:
- Mark record as `quarantined`
- Keep raw extraction data
- Store disagreement reason
- Exclude from public ranking
- Surface in admin review queue
- Do not attempt to auto-fix; escalate to human review

**7. Verification Statuses:**
- `verified` — extraction confirmed against evidence quote
- `verified_with_warning` — extraction correct but edge case or non-standard pricing
- `needs_review` — extraction ambiguous or has conflicting signals
- `conflicted` — extraction and verification disagreed (quarantined)
- `quarantined` — hallucination or data quality issue detected
- `unsupported_pricing_model` — pricing model cannot be verified as token-based

**8. Change-Sensitive Verification:**

If a price changed compared to previous crawl:
- Require stronger verification (higher threshold for Pass B)
- Require evidence quote (must be explicit in source)
- Compare against previous extracted value
- Mark as `price_change_candidate`
- Optionally escalate to human review if large change detected

Large change examples:
- >20% price difference
- input/output prices swapped
- missing output price that was previously present
- model disappeared from provider
- pricing unit changed

**9. Hallucination Prevention** (strict rules for extractor):

Extractor MUST NOT fill missing values:
- Missing price → `null`, NOT guessed or estimated
- "Contact sales" → set `pricing_model_type = enterprise_only`, NOT invented price
- No context window found → `null` with `context_window_confidence = low`
- Ambiguous model family → `needs_review` status, NOT assumed
- No evidence quote → CANNOT be marked verified; must be marked `needs_review` or `low_confidence`

**10. Public UI Behavior:**

Show by default:
- verified
- verified_with_warning
- medium/high confidence pending records with clear badge

Hide by default (admin-only):
- quarantined
- conflicted
- unsupported_pricing_model (unless explicitly useful)

**Goal:** The pipeline should not just say "verified"; it should prove which source text supports each value.

---

## Downstream Implications

### For Planning (Phase 2.1 Planning)
- Expand provider adapters from 12 to 30+ with tiered rollout
- Add canonical model registry schema and deduplication logic
- Enhance extraction schema to capture raw pricing + normalization metadata
- Add 6-dimensional confidence scoring + per-field confidence
- Implement evidence-anchoring requirements in all adapters
- Build multi-source discovery: feeds + APIs + pricing pages
- Add freshness SLA enforcement and stale-data badges
- Implement edge-case classification and quarantine logic

### For Execution (Phase 2.1 Execution)
- Must execute in waves: adapters first, then verification layer, then discovery enhancement
- Cannot skip evidence-anchoring (foundation for all confidence scoring)
- Freshness SLAs require schema updates before adapter implementation
- Deduplication requires canonical registry BEFORE multi-provider rollout
- Normalization rules must be finalized before execution (affects schema)

### For Verification & Testing
- All 30+ adapters must pass evidence-anchoring requirements
- Two-pass verification must reach 99%+ agreement on existing providers
- Confidence scoring breakdown must be human-reviewable in admin dashboard
- Freshness badges must display correctly across all tiers
- No quarantined extractions should make it to public UI
- Historical pricing must be queryable and auditable

---

## Open Questions for Next Phase

1. **Cost vs. Coverage Trade-off:** Should we batch Tier 4/5 provider additions into Phase 2.2 if they significantly increase pipeline complexity? Or commit to 30+ in Phase 2.1?

2. **Manual Review Capacity:** Human-in-the-loop confidence adjustment requires admin review queue. Do we have SLA for review turnaround? Or route only critical items?

3. **Feed Monitoring:** Changelog/RSS feed monitoring requires new infrastructure (likely a separate worker). Should this be Phase 2.1 or deferred to Phase 2.2?

4. **Consensus LLM Verification:** For pass C verification, should we use same extraction LLM (e.g., OpenAI) or rotate providers (e.g., Claude)? This affects cost.

5. **Historical Data Retention:** How far back should we retain raw crawl snapshots? Storage/query performance implications.

---

## Success Criteria for Phase 2.1 Revision Plan

1. ✅ All 8 areas have specific, actionable decisions (no vague direction)
2. ✅ Evidence-first verification is foundational to confidence scoring
3. ✅ Deduplication strategy is hybrid and doesn't rely on fuzzy matching alone
4. ✅ Normalization preserves both raw and normalized values
5. ✅ Freshness is tracked at multiple levels and affects confidence
6. ✅ Provider coverage path to 30+ is clear with tiering
7. ✅ Multi-source discovery doesn't over-rely on scraping
8. ✅ Confidence scoring is dimensionalized and explainable to users
9. ✅ No hallucinations can reach public UI
10. ✅ All decisions are implementable within estimated effort
