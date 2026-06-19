---
phase: 10-consumer-pricing-subscription-intelligence
fixed_at: 2026-06-19T15:30:00Z
review_path: .planning/phases/10-consumer-pricing-subscription-intelligence/10-REVIEW.md
iteration: 3
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report (Iteration 3)

**Fixed at:** 2026-06-19T15:30:00Z
**Source review:** `.planning/phases/10-consumer-pricing-subscription-intelligence/10-REVIEW.md`
**Iteration:** 3

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixes Applied

### CR-01: Consumer adapters double-enqueued in pipeline orchestrator

**Status:** fixed
**File(s):** `src/pipeline/orchestrator.ts`
**Commit:** `b0884c1`
**Applied fix:** Added `isConsumerTier1Provider`/`isConsumerTier2Provider` guard at the top of the general adapter loop (line 100) to skip consumer adapters. After `mirrorToMainRegistry()` registers consumer adapters in the main `adapters` Map, `getAllAdapters()` returns them. Without this guard, the general loop enqueues them with incorrect priority (10/lowest) and no tier classification, then the dedicated consumer loop enqueues them again with correct priority (5 or 6). This caused double Playwright sessions, double LLM API calls, and double rawData rows per pipeline run.

### WR-01: Dead code -- `VIRTUAL_TRIAL_ID_OFFSET` constant never used

**Status:** fixed
**File(s):** `app/promotions/page.tsx`
**Commit:** `130da84`
**Applied fix:** Removed the unused `VIRTUAL_TRIAL_ID_OFFSET = 100_000` constant and its 7-line comment block (lines 9-16). The constant was left behind after review #4 replaced offset-based ID generation with negative IDs (`-(row.id + 1)`).

### WR-02: `planSlug` column defined in schema but never populated

**Status:** fixed
**File(s):** `src/pipeline/workers/extract.ts`
**Commit:** `6dc92ba`
**Applied fix:** Added `planSlug: normalizePlanName(plan.planName).replace(/\s+/g, '-')` to both the insert values and the `onConflictDoUpdate` set block in the subscription plan upsert. This generates a stable, lowercase, hyphenated slug from the normalized plan name for cross-crawl consistency.

### IN-01: Consumer config files use inline intersection type instead of `ConsumerProviderConfig`

**Status:** fixed
**File(s):** `src/providers/consumer/chatgpt/config.ts`, `src/providers/consumer/claude/config.ts`, `src/providers/consumer/gemini/config.ts`, `src/providers/consumer/copilot/config.ts`, `src/providers/consumer/perplexity/config.ts`, `src/providers/consumer/poe/config.ts`, `src/providers/consumer/grok/config.ts`, `src/providers/consumer/you/config.ts`, `src/providers/consumer/phind/config.ts`, `src/providers/consumer/cursor/config.ts`
**Commit:** `1109353`
**Applied fix:** Updated all 10 consumer config files to import `ConsumerProviderConfig` from `../base` instead of `ProviderConfig` from `../../base`, and replaced the inline intersection type annotation (`ProviderConfig & { expectedPlanNames: string[]; adapterTimeoutMs: number }`) with the named `ConsumerProviderConfig` interface. This improves maintainability and consistency with the base class's `consumerConfig` getter.

### IN-02: Some adapter `buildExtractionPrompt` overrides are near-identical to base class default

**Status:** fixed
**File(s):** `src/providers/consumer/gemini/adapter.ts`
**Commit:** `7c381ef`
**Applied fix:** Removed the `buildExtractionPrompt()` override from `GeminiConsumerAdapter`. The override differed from the base class default only in the page description ("Gemini/Google One" vs interpolated `config.name`) and price example ("$19.99/mo" vs "$20/mo"). The base class already handles the common case with `config.name` interpolation.

### IN-03: `subscriptionPlans` upsert does not update `currency` on conflict

**Status:** fixed
**File(s):** `src/pipeline/workers/extract.ts`
**Commit:** `6dc92ba` (combined with WR-02)
**Applied fix:** Added `currency: plan.currency || 'USD'` to the `onConflictDoUpdate` set block for subscription plans. Previously, currency was only set on insert, so a provider currency change between crawls would not be reflected.

### IN-04: Test mocks hide real integration behavior

**Status:** fixed
**File(s):** `tests/pipeline/subscription-pipeline.test.ts`
**Commit:** `ce1d256`
**Applied fix:** Updated `getAllAdapters` mock to return a realistic list including both API providers (e.g., `openai`) and consumer adapters (simulating post-`mirrorToMainRegistry` state). Added explicit test `'should not double-enqueue consumer adapters (CR-01)'` that tracks all `collectQueue.add` calls and asserts each consumer adapter appears exactly once. This test would have caught the CR-01 double-enqueue bug.

## Remaining Issues

None -- all 7 findings were successfully fixed.

---

_Fixed: 2026-06-19T15:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
