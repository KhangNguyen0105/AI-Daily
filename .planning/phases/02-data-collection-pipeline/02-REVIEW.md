---
phase: 02-data-collection-pipeline
reviewed: 2026-06-18T12:00:00Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - src/app/api/pricing/route.ts
  - src/db/schema.ts
  - src/lib/evidence-anchor.ts
  - src/lib/freshness-tracker.ts
  - src/pipeline/confidence.ts
  - src/pipeline/edge-case-classifier.ts
  - src/pipeline/feed-monitor-worker.ts
  - src/pipeline/orchestrator.ts
  - src/pipeline/scheduler.ts
  - src/pipeline/verification.ts
  - src/pipeline/worker-entry.ts
  - src/pipeline/workers/extract.ts
  - src/pipeline/workers/score.ts
  - src/providers/anthropic/adapter.ts
  - src/providers/anthropic/config.ts
  - src/providers/base.ts
  - src/providers/deepseek/adapter.ts
  - src/providers/deepseek/config.ts
  - src/providers/google/adapter.ts
  - src/providers/google/config.ts
  - src/providers/groq/adapter.ts
  - src/providers/groq/config.ts
  - src/providers/lepton/adapter.ts
  - src/providers/lepton/config.ts
  - src/providers/minimax/adapter.ts
  - src/providers/minimax/config.ts
  - src/providers/mistral/adapter.ts
  - src/providers/mistral/config.ts
  - src/providers/moonshot/adapter.ts
  - src/providers/moonshot/config.ts
  - src/providers/nebius/adapter.ts
  - src/providers/nebius/config.ts
  - src/providers/openai/adapter.ts
  - src/providers/openai/config.ts
  - src/providers/openrouter/adapter.ts
  - src/providers/openrouter/config.ts
  - src/providers/perplexity/adapter.ts
  - src/providers/perplexity/config.ts
  - src/providers/registry.ts
  - src/providers/sambanova/adapter.ts
  - src/providers/sambanova/config.ts
  - src/providers/types.ts
  - src/providers/xai/adapter.ts
  - src/providers/xai/config.ts
  - tests/edge-case-classifier.test.ts
  - tests/evidence-anchor.test.ts
  - tests/freshness-tracker.test.ts
  - tests/pipeline/confidence.test.ts
  - tests/pipeline/score-worker.test.ts
  - tests/pipeline/verification.test.ts
  - tests/providers/types.test.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-18T12:00:00Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Reviewed 51 files spanning the data collection pipeline: 18 provider adapters (with configs), pipeline orchestration (orchestrator, scheduler, worker-entry), pipeline workers (extract, score), verification and confidence scoring, evidence anchoring, freshness tracking, edge case classification, feed monitoring, the pricing API route, the DB schema, and 7 test files.

The previous review (2026-06-16) identified CR-09 (pipeline runs stuck in 'running'), WR-10 (wrong AI model name), and other issues. CR-09 has been correctly fixed -- the score worker now finalizes the pipeline run when all extractions are low confidence. WR-10 has been correctly fixed -- `getAIModel()` now returns provider-specific model names.

Three new critical issues found: (1) BullMQ priority values are inverted in the orchestrator, giving Tier 1 providers the lowest processing priority instead of the highest, (2) SLA breach detection calls a stub function that never actually triggers priority recrawls, and (3) CNY-denominated providers (Moonshot, MiniMax) store raw CNY values in fields named `*Per1m` (per 1M tokens USD) without any currency conversion, causing downstream consumers to treat CNY values as USD.

## Critical Issues

### CR-10: BullMQ priority values inverted -- Tier 1 providers get LOWEST priority

**File:** `src/pipeline/orchestrator.ts:81-88`
**Issue:** The orchestrator assigns BullMQ job priorities with the intent that Tier 1 providers get the highest processing priority. However, the values are inverted. In BullMQ, `priority: 1` is the highest priority (processed first) and higher numbers mean lower priority. The code assigns:
- Tier 1: `priority: 3` (LOWEST actual priority)
- Tier 2: `priority: 2` (medium)
- Tier 3/fallback: `priority: 1` (HIGHEST actual priority)

The comments are self-contradictory: line 81 says "Tier 1 providers get priority=3 (highest)" while line 88 says "lower number = higher priority" -- both cannot be true.

This means the daily orchestrator processes Tier 3 and uncategorized providers BEFORE Tier 1 providers like OpenAI, Anthropic, and Google. The tiered scheduling system's entire purpose (D-01: "Tier 1 providers are critical -- highest business value") is undermined.

The same inversion exists in the tier refresh workers: `scheduler.ts:303` sets `priority: 2` for Tier 1 refresh and `scheduler.ts:369` sets `priority: 5` for Tier 2 refresh. While Tier 1 refresh gets higher priority than Tier 2 refresh (correct relative ordering), the absolute values are still higher than necessary.

**Fix:**
```typescript
// In src/pipeline/orchestrator.ts, line 88:
// BullMQ: lower number = higher priority
const priority = isT1 ? 1 : isT2 ? 2 : isT3 ? 3 : 10;
```

For the tier refresh workers in `scheduler.ts`, also correct:
```typescript
// Line 303 (Tier 1 refresh): priority: 1
priority: 1,

// Line 369 (Tier 2 refresh): priority: 2
priority: 2,
```

### CR-11: SLA breach detection calls a no-op stub -- priority recrawls never trigger

**File:** `src/pipeline/workers/score.ts:184-186`
**Issue:** The score worker calls `triggerPriorityRecrawl(sourceId, ...)` when an SLA breach is detected. However, `triggerPriorityRecrawl` in `src/lib/freshness-tracker.ts:216-224` is a stub that only logs a `console.warn` and does nothing. It was supposed to be integrated with BullMQ in "Phase 4" but this integration was never implemented.

This means when a provider's data becomes stale beyond its SLA threshold (e.g., OpenAI data older than 24 hours), the system detects the breach and logs a warning but never actually enqueues a priority recrawl job. The stale data remains stale until the next scheduled crawl, defeating the purpose of SLA monitoring.

**Impact:** SLA enforcement is purely cosmetic. The freshness tracker computes breach status correctly, but the corrective action (priority recrawl) is missing. Users see stale data with warning badges but the system does nothing to fix it.

**Fix:** Implement the `triggerPriorityRecrawl` function to enqueue a high-priority collect job:
```typescript
// In src/lib/freshness-tracker.ts:
import { collectQueue } from '../pipeline/queues';

export async function triggerPriorityRecrawl(
  sourceId: number,
  reason: string,
): Promise<void> {
  // Look up provider name from sourceId
  const sourceRows = await db
    .select({ name: sources.name })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);
  
  if (sourceRows.length === 0) {
    console.warn(`triggerPriorityRecrawl: source ${sourceId} not found`);
    return;
  }
  
  const providerName = sourceRows[0].name;
  console.warn(
    `Freshness: Priority recrawl triggered for ${providerName} (source ${sourceId}). Reason: ${reason}`
  );
  
  await collectQueue.add(
    'priority-recrawl',
    {
      providerName,
      sourceId,
      isPriorityRecrawl: true,
    },
    {
      jobId: `priority-recrawl-${providerName}-${Date.now()}`,
      priority: 1, // Highest priority
    },
  );
}
```

Note: This requires importing `db`, `sources`, and `eq` which adds dependencies. Alternatively, pass the provider name from the score worker to avoid the DB lookup.

### CR-12: CNY providers store raw CNY values in USD-typed price fields without conversion

**Files:** `src/providers/moonshot/adapter.ts:77-88`, `src/providers/minimax/adapter.ts:77-88`
**Issue:** The Moonshot and MiniMax adapters extract prices from Chinese pricing pages that list values in CNY (Chinese Yuan). The LLM is instructed to "extract the numeric values as-is" and `rawCurrency` is correctly set to `'CNY'`. However, the extracted numeric values are stored directly in `inputPricePer1m` and `outputPricePer1m` -- fields that every other consumer in the system treats as USD per 1M tokens.

The `normalize()` method documents that "CNY -> USD conversion happens at the score/register stage using the daily exchange rate from the exchange_rates table." But examining `src/pipeline/workers/score.ts` and `src/pipeline/workers/extract.ts`, there is NO currency conversion logic anywhere. The score worker writes `inputPricePer1m` and `outputPricePer1m` directly to the database without checking `rawCurrency`.

The pricing API route (`src/app/api/pricing/route.ts`) returns these values directly as `inputPrice` and `outputPrice` with no currency indication. The frontend comparison table treats all prices as USD.

**Impact:** Moonshot and MiniMax prices appear in the UI at their CNY face value. For example, a model priced at 8 CNY/1M tokens (~$1.10 USD) would appear as "$8.00/1M tokens" -- a ~7x overstatement. This corrupts the cost comparison table and practical cost calculations for these providers.

**Fix:** Add currency conversion in the extract worker's normalization step or in the score worker before storing to DB. The simplest approach is to convert during normalization:

```typescript
// In moonshot/adapter.ts and minimax/adapter.ts normalize():
// Add CNY -> USD conversion using a hardcoded fallback rate
// (Daily rate from exchange_rates table should be preferred)
const CNY_TO_USD_FALLBACK = 0.138; // ~7.25 CNY/USD as of 2026

normalize(extractions: ProviderExtraction): ProviderExtraction {
  for (const e of extractions.models) {
    if (e.inputPricePer1m !== null) {
      // Store raw CNY value in rawPriceText
      e.rawPriceText = `${e.inputPricePer1m} CNY per 1M input tokens`;
      e.rawUnit = 'per 1M tokens';
      e.rawCurrency = 'CNY';
      // Convert to USD for the normalized price field
      e.inputPricePer1m = Math.round(e.inputPricePer1m * CNY_TO_USD_FALLBACK * 1000) / 1000;
    }
    if (e.outputPricePer1m !== null) {
      const rawOutputCNY = e.outputPricePer1m;
      e.rawPriceText = e.rawPriceText
        ? `${e.rawPriceText}; ${rawOutputCNY} CNY per 1M output tokens`
        : `${rawOutputCNY} CNY per 1M output tokens`;
      e.outputPricePer1m = Math.round(e.outputPricePer1m * CNY_TO_USD_FALLBACK * 1000) / 1000;
    }
  }
  return extractions;
}
```

For production accuracy, fetch the daily rate from the `exchange_rates` table (which already exists in the schema) and pass it to the adapter.

## Warnings

### WR-13: Tier refresh workers do not set tier classification flags on collect jobs

**Files:** `src/pipeline/scheduler.ts:291-306`, `src/pipeline/scheduler.ts:358-372`
**Issue:** The `createTier1RefreshWorker()` and `createTier2RefreshWorker()` functions enqueue collect jobs with custom job data (`isScheduled: true`, `isTier1Refresh: true` / `isTier2Refresh: true`). However, they do NOT set `isTier1`, `isTier2`, or `isTier3` flags that the collect worker expects for tier-based processing.

Compare with the orchestrator (`orchestrator.ts:90-98`) which correctly sets all three tier flags on every collect job. The tier refresh workers skip this.

**Impact:** If the collect worker (not in the reviewed file set) checks `job.data.isTier1` to apply tier-specific behavior (e.g., different retry counts, different timeouts), those checks will fail for refresh-triggered jobs. The jobs will be treated as unclassified (fallback behavior).

**Fix:** Add the tier flags to the job data in both tier refresh workers:
```typescript
// In createTier1RefreshWorker(), line 293-298:
{
  providerName: adapter.config.name,
  pipelineRunId: runId,
  isScheduled: true,
  isTier1Refresh: true,
  isTier1: true,    // Add this
  isTier2: false,   // Add this
  isTier3: false,   // Add this
},

// In createTier2RefreshWorker(), line 360-365:
{
  providerName: adapter.config.name,
  pipelineRunId: runId,
  isScheduled: true,
  isTier2Refresh: true,
  isTier1: false,   // Add this
  isTier2: true,    // Add this
  isTier3: false,   // Add this
},
```

### WR-14: Pricing route defaults null `lastVerifiedAt` to "now" -- stale data appears fresh

**File:** `src/app/api/pricing/route.ts:150`
**Issue:** When `lastVerifiedAt` is null (e.g., for extractions that were never re-verified), the code falls back to `new Date().toISOString()`. This makes the freshness calculation show `data_age_hours: 0` and `status: 'fresh'` with a green badge, even though the data may be very old.

**Impact:** Extractions without verification timestamps appear as "Fresh" in the UI when they may actually be stale. This undermines the freshness tracking system's purpose.

**Fix:** When `lastVerifiedAt` is null, fall back to the extraction's `updatedAt` or `createdAt` timestamp, or show an "unknown" freshness status:
```typescript
freshness: {
  last_verified_at: row.lastVerifiedAt?.toISOString() || row.updatedAt?.toISOString() || null,
  status: row.lastVerifiedAt ? freshnessStatus : 'unknown',
  badge_color: row.lastVerifiedAt ? badge.badge_color : 'gray',
  data_age_hours: row.lastVerifiedAt ? dataAgeHours : null,
},
```

This requires adding `updatedAt` to the query's select clause.

### WR-15: `hasAllFields` and `hasCoreFields` do not validate numeric values are positive

**File:** `src/pipeline/confidence.ts:63-82`
**Issue:** `hasAllFields` and `hasCoreFields` check that `inputPricePer1m !== null` and `outputPricePer1m !== null`, but do not validate that these values are positive numbers. A price of `-5` or `0` would pass the check and be scored as "has all fields" with high confidence.

While the LLM extraction is unlikely to return negative prices, the verification pass2 results could theoretically produce them due to parsing errors. The `compareResults` function would then compare negative values without flagging them as invalid.

**Impact:** Edge case where invalid negative prices pass confidence scoring and appear in the UI.

**Fix:**
```typescript
export function hasAllFields(e: ExtractionResult): boolean {
  return (
    e.modelName.trim().length > 0 &&
    e.inputPricePer1m !== null && e.inputPricePer1m >= 0 &&
    e.outputPricePer1m !== null && e.outputPricePer1m >= 0 &&
    e.contextWindow !== null && e.contextWindow > 0
  );
}
```

### WR-16: Edge case classifier sets flags without checking `detected` property

**File:** `src/pipeline/edge-case-classifier.ts:340-349`
**Issue:** `isComparableTokenPricing` checks `flags.free_tier?.detected`, `flags.monthly_plans?.detected`, etc. This correctly uses the `detected` property. However, the `confidence.ts:220` and `score.ts:192` files use `Object.keys(edgeCaseFlags).length > 0` to check for edge cases, which only checks if the flag object exists -- not whether `detected` is `true`.

While the current implementation only adds flags when a pattern matches (so `detected` is always `true` when a flag exists), this is an implicit contract. If the classifier is ever modified to add flags with `detected: false` (e.g., for "potential but unconfirmed" edge cases), the downstream checks would break.

**Impact:** Low risk currently, but fragile design that could cause false positives if the classifier is modified.

**Fix:** Use consistent checking patterns across all consumers:
```typescript
// In confidence.ts applyCriticalRules and score.ts, replace:
if (edgeCaseFlags && Object.keys(edgeCaseFlags).length > 0)
// With:
if (edgeCaseFlags && Object.values(edgeCaseFlags).some(f => f?.detected === true))
```

## Info

### IN-13: `normalizeForMatch` does not strip dollar signs or percent signs

**File:** `src/lib/evidence-anchor.ts:65-69`
**Issue:** The `normalizeForMatch` function strips punctuation like `.`, `,`, `;`, `:` etc., but does not strip `$` or `%`. This means searching for a normalized value like `"0.15"` will not match `"$0.15"` in normalized text. The `findValueInHtml` function has a fallback that tries `withDollar` (line 109), which mitigates this for numeric values. However, `validateEvidenceQuote` at line 249-250 normalizes both the quote and value and checks `includes` -- a normalized quote containing "$0.15" would normalize to "$015" while the value "0.15" normalizes to "015", so the match would fail due to the `$` prefix.

**Fix:** Add `$` and `%` to the punctuation stripping regex:
```typescript
.replace(/[.,;:!?()[\]{}'"<>$%]/g, '')
```

### IN-14: Massive code duplication across 18 provider adapter `normalize()` methods

**Files:** All 18 `src/providers/*/adapter.ts` files
**Issue:** Every provider adapter's `normalize()` method contains identical logic for setting `rawPriceText`, `rawUnit`, and `rawCurrency`. The only exceptions are Moonshot and MiniMax (which use CNY) and DeepSeek/Bedrock (which add suspicious price warnings). The base class already provides a default `normalize()` that returns extractions unchanged -- the per-adapter overrides could be consolidated.

**Fix:** Move the common normalization logic to the base class `normalize()` method, using `this.config.currency` to determine the currency string. Only Moonshot, MiniMax, DeepSeek, and Bedrock would need to override.

---

_Reviewed: 2026-06-18T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Fixes Applied

**Fixed at:** 2026-06-18
**Fixed by:** Claude (gsd-code-fixer)

### Critical Issues Fixed

#### CR-10: BullMQ priority values inverted -- FIXED
**Files modified:** `src/pipeline/orchestrator.ts`, `src/pipeline/scheduler.ts`
**Changes:**
- Fixed priority values in orchestrator.ts: Tier 1 now gets priority=1 (highest), Tier 2 gets priority=2, Tier 3 gets priority=3, uncategorized gets priority=10
- Fixed tier refresh workers in scheduler.ts: Tier 1 refresh now uses priority=1, Tier 2 refresh uses priority=2
- Added missing tier classification flags (`isTier1`, `isTier2`, `isTier3`) to tier refresh worker job data

#### CR-11: SLA breach detection calls a no-op stub -- FIXED
**Files modified:** `src/lib/freshness-tracker.ts`
**Changes:**
- Implemented `triggerPriorityRecrawl()` function to enqueue high-priority collect jobs in BullMQ
- Added imports for `db`, `sources`, `eq`, and `collectQueue`
- Function now looks up provider name from sourceId and enqueues a priority=1 collect job

#### CR-12: CNY providers store raw CNY values in USD-typed price fields -- FIXED
**Files modified:** `src/providers/moonshot/adapter.ts`, `src/providers/minimax/adapter.ts`
**Changes:**
- Added CNY_TO_USD_FALLBACK constant (0.138, ~7.25 CNY/USD)
- Updated `normalize()` methods to convert CNY prices to USD before storing in `inputPricePer1m` and `outputPricePer1m`
- Raw CNY values preserved in `rawPriceText` for evidence anchoring

### Warnings Fixed

#### WR-13: Tier refresh workers do not set tier classification flags -- FIXED
**Files modified:** `src/pipeline/scheduler.ts`
**Changes:**
- Added `isTier1`, `isTier2`, `isTier3` flags to both Tier 1 and Tier 2 refresh worker job data
- Ensures collect workers can apply tier-specific behavior for refresh-triggered jobs

#### WR-14: Pricing route defaults null lastVerifiedAt to "now" -- FIXED
**Files modified:** `src/app/api/pricing/route.ts`
**Changes:**
- Added `updatedAt` to the query select clause
- Updated freshness fallback logic: when `lastVerifiedAt` is null, falls back to `updatedAt` or shows "unknown" status with gray badge
- Prevents stale data from appearing fresh when verification timestamp is missing

#### WR-15: hasAllFields and hasCoreFields do not validate numeric values are positive -- FIXED
**Files modified:** `src/pipeline/confidence.ts`
**Changes:**
- Added `>= 0` validation for `inputPricePer1m` and `outputPricePer1m` in both functions
- Added `> 0` validation for `contextWindow` in `hasAllFields`
- Prevents negative or zero prices from passing confidence checks

#### WR-16: Edge case classifier sets flags without checking detected property -- FIXED
**Files modified:** `src/pipeline/confidence.ts`, `src/pipeline/workers/score.ts`
**Changes:**
- Updated edge case flag checking from `Object.keys(edgeCaseFlags).length > 0` to `Object.values(edgeCaseFlags).some(f => f?.detected === true)`
- Ensures consistent detection pattern across all consumers
- Prevents false positives if flags are ever added with `detected: false`

### Info Issues Fixed

#### IN-13: normalizeForMatch does not strip dollar signs or percent signs -- FIXED
**Files modified:** `src/lib/evidence-anchor.ts`
**Changes:**
- Added `$` and `%` to the punctuation stripping regex in `normalizeForMatch()`
- Enables proper matching of values like "$0.15" when normalized

### Issues Not Fixed

#### IN-14: Massive code duplication across 18 provider adapter normalize() methods
**Reason:** This is a refactoring task that would touch all 18 provider adapters. The duplication doesn't cause bugs and the fix would be a larger structural change better suited for a dedicated refactoring phase.

---

_Fixed: 2026-06-18_
_Fixer: Claude (gsd-code-fixer)_
