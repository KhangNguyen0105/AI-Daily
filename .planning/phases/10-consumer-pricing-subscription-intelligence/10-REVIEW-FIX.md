---
phase: 10-consumer-pricing-subscription-intelligence
fixed_at: 2026-06-19T12:00:00Z
review_path: .planning/phases/10-consumer-pricing-subscription-intelligence/10-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 10
skipped: 2
status: partial
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-06-19T12:00:00Z
**Source review:** `.planning/phases/10-consumer-pricing-subscription-intelligence/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (1 critical, 7 warnings, 4 info)
- Fixed: 10
- Skipped: 2

## Fixed Issues

### CR-01: Subscription plan upsert missing planName normalization
**Status:** fixed
**Files modified:** `src/pipeline/workers/extract.ts`
**Commit:** `6154596`
**Applied fix:** Added `normalizePlanName()` utility function that lowercases, trims, and collapses whitespace. Applied normalization to `planName` in the insert values before the upsert. This prevents duplicate stale rows when the LLM returns different casing/whitespace across crawls.

### WR-01: Orchestrator consumerMirrored guard is dead code
**Status:** fixed
**Files modified:** `src/pipeline/orchestrator.ts`
**Commit:** `c8d4298`
**Applied fix:** Moved `let consumerMirrored = false` from function-local scope (inside `orchestrateDailyRun()`) to module scope. The guard now correctly caches the mirroring state across invocations, avoiding redundant `mirrorToMainRegistry()` calls on every pipeline run.

### WR-02: Promise.race timeout not cleared -- leaked timers
**Status:** fixed
**Files modified:** All 10 consumer adapter files (`src/providers/consumer/*/adapter.ts`)
**Commit:** `c317267`
**Applied fix:** In all 10 consumer adapters: (1) declared `timeoutId` variable before the try block, (2) captured the `setTimeout` return value in `timeoutId`, (3) added a `finally` block that calls `clearTimeout(timeoutId)` to prevent leaked timers on successful extraction.

### WR-03: Consumer adapter subscription plan upsert missing providerName in conflict SET
**Status:** fixed
**Files modified:** `src/pipeline/workers/extract.ts`
**Commit:** `6154596`
**Applied fix:** Added `providerName` to the `onConflictDoUpdate` set block, so that if a plan's provider name is corrected between crawls, the updated value persists in the database.

### WR-04: SubscriptionPlanData interface defined in server component, imported by client component
**Status:** fixed
**Files modified:** `app/lib/types.ts`, `app/subscriptions/page.tsx`, `app/components/SubscriptionCard.tsx`, `app/components/SubscriptionsPageClient.tsx`
**Commit:** `97c4fb3`
**Applied fix:** Extracted `SubscriptionPlanData` interface from `app/subscriptions/page.tsx` (server component) into the existing shared types file `app/lib/types.ts`. Updated all imports in `SubscriptionCard.tsx` and `SubscriptionsPageClient.tsx` to reference `@/app/lib/types` instead of `@/app/subscriptions/page`. The server page now imports from the shared file as well.

### WR-05: Virtual promotion ID offset uses magic number 100000
**Status:** fixed
**Files modified:** `app/promotions/page.tsx`
**Commit:** `f434893`
**Applied fix:** Replaced the inline magic number `100000` with a named constant `VIRTUAL_TRIAL_ID_OFFSET = 100_000` declared at the top of the file with documentation explaining its purpose and safety margin.

### WR-06: PromotionData.type field type assertion may be needed
**Status:** fixed
**Files modified:** `app/promotions/page.tsx`, `app/model/[slug]/page.tsx`
**Commit:** `1646885`
**Applied fix:** Added explicit type assertion `as PromotionData['type']` in `promotions/page.tsx` and `as 'free_tier' | 'promotion' | 'beta' | 'free_trial'` in `model/[slug]/page.tsx` for the `row.type` mapping. This prevents potential TypeScript compile errors if Drizzle infers the column type as `string` instead of the literal union.

### IN-01: Dead code -- consumer schemas barrel file is never imported
**Status:** fixed
**Files modified:** `src/providers/consumer/schemas.ts` (deleted)
**Commit:** `786aee3`
**Applied fix:** Deleted the unused barrel file `src/providers/consumer/schemas.ts` which re-exported `consumerSubscriptionSchema` from `../schemas`. All 10 consumer adapters import directly from `../../schemas`, making this file dead code.

### IN-03: All consumer adapters hardcode currency: 'USD'
**Status:** fixed
**Files modified:** All 10 consumer adapter files (`src/providers/consumer/*/adapter.ts`)
**Commit:** `c317267`
**Applied fix:** Changed `currency: 'USD'` to `currency: this.config.currency ?? 'USD'` in all 10 consumer adapters. This uses the adapter config's currency field (which all configs already define as 'USD') with a fallback, enabling future non-USD providers without code changes.

### IN-04: Double-cast in mirrorToMainRegistry
**Status:** fixed
**Files modified:** `src/providers/consumer/registry.ts`
**Commit:** `bfd2ece`
**Applied fix:** Changed `registerAdapter(adapter as unknown as ProviderAdapter)` to `registerAdapter(adapter)` since `ConsumerAdapter` extends `ProviderAdapter` and the inheritance relationship satisfies the type. Also removed the now-unused `import type { ProviderAdapter } from '../base'`.

## Skipped Issues

### WR-07: PromotionsPageClient imports PromotionCard from external file not in Phase 10 scope
**File:** `app/components/PromotionsPageClient.tsx:5`
**Reason:** This is an informational observation, not a bug. The `PromotionCard` import resolves correctly to an existing file that exports the expected component. No code change is needed. Cross-phase imports are architecturally sound.

### IN-02: Massive code duplication across 10 consumer adapters
**Files:** All 10 `src/providers/consumer/*/adapter.ts` files
**Reason:** This is a major structural refactor requiring: (1) adding a template method `buildExtractionPrompt()` to the `ConsumerAdapter` base class, (2) moving the shared `extract()` logic to the base class, (3) updating all 10 adapters to only override the prompt method. The risk of introducing regressions in the extraction pipeline is too high for an automated fix. This refactor should be planned as a dedicated phase with thorough testing.

---

_Fixed: 2026-06-19T12:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
