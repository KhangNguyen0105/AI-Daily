---
phase: 07-intelligence-analytics
fixed_at: 2026-06-15T18:30:00Z
review_path: .planning/phases/07-intelligence-analytics/07-REVIEW.md
iteration: 1
findings_in_scope: 14
fixed: 14
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-06-15T18:30:00Z
**Source review:** .planning/phases/07-intelligence-analytics/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 14
- Fixed: 14
- Skipped: 0

All 14 findings were already resolved in commit `a86e2f7 @ fix(07): apply code review fixes — 14 findings resolved`. No additional commits were needed. The REVIEW.md was written against the pre-fix code, and the fix commit already addressed every finding.

## Fixed Issues

### CR-01: Wildcard promotion patterns silently dropped in compare page

**Files modified:** `app/compare/page.tsx`
**Commit:** a86e2f7
**Applied fix:** Replaced `inArray(promotions.modelPattern, modelNames)` with `db.select().from(promotions)` to fetch all promotions, then applied application-level wildcard matching (exact, `*`, and suffix `*` patterns).

### CR-02: Unsafe `null as unknown as ModelOption` cast

**Files modified:** `app/components/ComparePageClient.tsx`
**Commit:** a86e2f7
**Applied fix:** Changed state type to `useState<(ModelOption | null)[]>(initialSelected)` to reflect that empty slots are null. Removed the double-cast `null as unknown as ModelOption`.

### CR-03: Nested setTimeout without cleanup in AlertBanner

**Files modified:** `app/components/AlertBanner.tsx`
**Commit:** a86e2f7
**Applied fix:** Added refs (`fadeOutTimerRef`, `hideTimerRef`) to track both timeout IDs. Extracted a shared `startFadeOut` helper that clears existing timers before scheduling new ones. Cleanup function clears both timers on unmount. Applied same pattern to `dismissAlert` and `dismissAll`.

### WR-01: Stale closure in ComparePageClient callbacks

**Files modified:** `app/components/ComparePageClient.tsx`
**Commit:** a86e2f7
**Applied fix:** Converted `handleSelect`, `handleAdd`, and `handleRemove` to use functional state updaters (`setSelectedModels((prev) => ...)`) instead of relying on closure-captured `selectedModels`. Dependencies reduced to only `[syncUrl]`.

### WR-02: Duplicated `isPromoActive` logic across modules

**Files modified:** `app/components/PromotionCard.tsx`, `app/components/PromotionsPageClient.tsx`, `app/lib/promotion-utils.ts`
**Commit:** a86e2f7
**Applied fix:** Extracted `isPromoActive` function to `app/lib/promotion-utils.ts`. Both `PromotionCard.tsx` and `PromotionsPageClient.tsx` now import from the shared utility.

### WR-03: Layout DB query fetches all extractions with no LIMIT

**Files modified:** `app/layout.tsx`
**Commit:** a86e2f7
**Applied fix:** Replaced the application-level `Set`-based deduplication with a raw SQL `DISTINCT ON (model_name, source_id)` query that returns only the latest price per model+source at the SQL level.

### WR-04: Unstable array-index keys in compare page model grid

**Files modified:** `app/components/ComparePageClient.tsx`
**Commit:** a86e2f7
**Applied fix:** Generated stable `slotIds` based on model identity (`modelName:sourceId:index` for non-null, `empty:index` for null slots) and used `slotIds[index]` as React keys instead of array indices.

### WR-05: Alert dimension mismatch -- only input price checked

**Files modified:** `app/components/AlertSetForm.tsx`
**Commit:** a86e2f7
**Applied fix:** Added explicit "Input price per 1M tokens" label to the threshold input field. The label text is now `Input price per 1M tokens` instead of a generic prompt, making it clear to users that alerts are for input price only.

### WR-06: PromotionCard renders unsanitized scraped data

**Files modified:** `app/components/PromotionCard.tsx`, `app/components/PromotionsList.tsx`
**Commit:** a86e2f7
**Applied fix:** Applied `sanitizeDisplayName()` to `promo.description` before rendering in both `PromotionCard.tsx` and `PromotionsList.tsx`. This sanitizes against deceptive Unicode characters in scraped content.

### IN-01: Misleading "DISTINCT ON" comment in layout

**Files modified:** `app/layout.tsx`
**Commit:** a86e2f7
**Applied fix:** Updated comment to accurately describe the implementation: "WR-03: Use DISTINCT ON to get only the latest price per model+source at SQL level".

### IN-02: Model names with special characters could produce invalid HTML IDs

**Files modified:** `app/components/AlertSetForm.tsx`
**Commit:** a86e2f7
**Applied fix:** Added a `slugify()` function that lowercases and replaces non-alphanumeric characters with hyphens. HTML IDs now use `slugify(modelName)` instead of raw `modelName`.

### IN-03: `costMap` is computed but never used in ComparisonCard

**Files modified:** `app/components/ComparisonCard.tsx`
**Commit:** a86e2f7
**Applied fix:** Removed the unused `costMap` variable. The component now uses direct `.find()` lookup against `practicalCosts` without the intermediate map.

### IN-04: Two nearly identical promotion type badge style maps

**Files modified:** `app/components/PromotionCard.tsx`, `app/components/ComparisonCard.tsx`, `app/components/PromotionsList.tsx`, `app/lib/promotion-utils.ts`
**Commit:** a86e2f7
**Applied fix:** Extracted `PROMO_BADGE_STYLES` and `PROMO_BADGE_LABELS` to `app/lib/promotion-utils.ts`. All three consumer files now import from the shared utility.

### IN-05: Double top-padding on alerts page

**Files modified:** `app/alerts/page.tsx`
**Commit:** a86e2f7
**Applied fix:** Removed the redundant `pt-14` class from the alerts page `<main>` element. The root layout already provides `pt-14` via its wrapper `<div>`.

---

_Fixed: 2026-06-15T18:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
_Status: All 14 findings already resolved in commit a86e2f7; no additional fixes needed_
