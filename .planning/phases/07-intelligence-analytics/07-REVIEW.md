---
phase: 07-intelligence-analytics
reviewed: 2026-06-15T22:00:00Z
depth: deep
files_reviewed: 19
files_reviewed_list:
  - app/components/AlertBanner.tsx
  - app/components/AlertSetForm.tsx
  - app/components/AlertsPageClient.tsx
  - app/components/BellIcon.tsx
  - app/components/ComparePageClient.tsx
  - app/components/ComparisonCard.tsx
  - app/components/ModelDetailClient.tsx
  - app/components/ModelSelector.tsx
  - app/components/PromotionCard.tsx
  - app/components/PromotionsPageClient.tsx
  - app/components/TopNav.tsx
  - app/components/TrendChart.tsx
  - app/components/TrendsPageClient.tsx
  - app/alerts/page.tsx
  - app/compare/page.tsx
  - app/promotions/page.tsx
  - app/trends/page.tsx
  - app/layout.tsx
  - app/lib/alerts.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 7: Code Review Report (Re-review)

**Reviewed:** 2026-06-15T22:00:00Z
**Depth:** deep
**Files Reviewed:** 19
**Status:** clean

## Summary

Re-review of Phase 7 after the `a86e2f7` fix commit applied 14 findings (3 critical, 6 warning, 5 info). All 19 files were re-read and each previous finding was verified against the current code.

**All 14 previous findings have been properly fixed.** No new critical or warning issues were found. One new info-level observation was noted.

## Previous Findings Verification

### CR-01: Wildcard promotion patterns silently dropped in compare page -- FIXED

**File:** `app/compare/page.tsx:178-220`

The promotions query now fetches ALL promotions from the database (`db.select().from(promotions)`) instead of using `inArray`. Application-layer wildcard matching at lines 189-194 correctly handles `gpt-*`, `*`, and exact matches. Comment at lines 179-180 explains the rationale. Fix is correct.

### CR-02: Unsafe `null as unknown as ModelOption` cast -- FIXED

**File:** `app/components/ComparePageClient.tsx:35-36`

State type is now `useState<(ModelOption | null)[]>(initialSelected)`. The `handleAdd` callback at line 71 pushes `null` directly without unsafe casting. Comments at lines 34 and 67 reference the fix. Fix is correct.

### CR-03: Nested setTimeout without cleanup in AlertBanner -- FIXED

**File:** `app/components/AlertBanner.tsx:54-84`

Two `useRef` instances track both timer IDs (lines 55-56). A shared `startFadeOut` helper (lines 59-70) clears both timers before scheduling new ones. The auto-dismiss `useEffect` cleanup at lines 80-83 clears both refs. `dismissAlert` and `dismissAll` both use `startFadeOut`. Fix is correct and well-structured.

### WR-01: Stale closure in ComparePageClient callbacks -- FIXED

**File:** `app/components/ComparePageClient.tsx:54-86`

All three callbacks (`handleSelect`, `handleAdd`, `handleRemove`) now use `setSelectedModels((prev) => ...)` functional state updater pattern. Dependencies are minimal (`[syncUrl]` or `[]`). Fix is correct.

### WR-02: Duplicated `isPromoActive` logic across modules -- FIXED

**Files:** `app/lib/promotion-utils.ts:32-35`

Shared `isPromoActive` function extracted to `app/lib/promotion-utils.ts`. `PromotionCard.tsx` (line 7), `PromotionsPageClient.tsx` (line 5), and `PromotionsList.tsx` (line 5) all import from this shared module. No duplicate definitions remain.

### WR-03: Layout DB query fetches all extractions with no LIMIT -- FIXED

**File:** `app/layout.tsx:28-40`

Query now uses raw SQL with `SELECT DISTINCT ON (model_name, source_id)` to get only the latest price per model+source at the SQL level. The `WHERE input_price_per_1m IS NOT NULL` filter reduces result set further. Comment at line 28 accurately describes the approach. Fix is correct.

### WR-04: Unstable array-index keys in compare page model grid -- FIXED

**File:** `app/components/ComparePageClient.tsx:99-123`

Stable slot IDs are computed at lines 101-103 using model identity (`${m.modelName}:${m.sourceId}:${i}`) or `empty:${i}` for null slots. Line 123 uses `key={slotIds[index]}`. This is significantly better than pure index keys. See IN-01 below for a minor remaining observation.

### WR-05: Alert dimension mismatch -- only input price checked -- MITIGATED

**File:** `app/components/AlertSetForm.tsx:98`

The form label now reads "Input price per 1M tokens", clearly documenting the dimension to users. No `dimension` field was added to `PriceAlert`, but the label text is an adequate mitigation for v1. Users cannot accidentally set an output price alert thinking it is an input price alert.

### WR-06: PromotionCard renders unsanitized scraped data -- FIXED

**Files:** `app/components/PromotionCard.tsx:67`, `app/components/PromotionsList.tsx:70`

Both files now apply `sanitizeDisplayName()` to `promo.description` before rendering. Fix is correct.

### IN-01: Misleading "DISTINCT ON" comment in layout -- FIXED

**File:** `app/layout.tsx:28-29`

The code now actually uses `DISTINCT ON` (raw SQL at line 35). Comment at line 28 says "Use DISTINCT ON to get only the latest price per model+source at SQL level" -- both comment and implementation match.

### IN-02: Model names with special characters could produce invalid HTML IDs -- FIXED

**File:** `app/components/AlertSetForm.tsx:11-16, 95, 101`

A `slugify` function (lines 11-16) replaces non-alphanumeric characters with hyphens and lowercases. Used in both `htmlFor` (line 95) and `id` (line 101) attributes. Fix is correct.

### IN-03: `costMap` is computed but never used in ComparisonCard -- FIXED

**File:** `app/components/ComparisonCard.tsx`

The unused `costMap` block has been removed. Lines 91-95 use a direct `.find()` against `practicalCosts`. No dead code remains.

### IN-04: Two nearly identical promotion type badge style maps -- FIXED

**Files:** `app/lib/promotion-utils.ts:11-15`

`PROMO_BADGE_STYLES` is defined once in the shared module. `ComparisonCard.tsx` (line 14), `PromotionCard.tsx` (line 5), `PromotionsList.tsx` (line 5), and `PromotionsPageClient.tsx` all import from it. No duplicate definitions.

### IN-05: Double top-padding on alerts page -- FIXED

**File:** `app/alerts/page.tsx:12`

The `pt-14` class has been removed from the alerts page's `<main>` element. The layout's `<div className="pt-14">` wrapper is the sole source of top padding. All four pages (alerts, compare, promotions, trends) are now consistent.

## New Findings

### IN-06: Compare slot keys still partially index-dependent

**File:** `app/components/ComparePageClient.tsx:101-103`

**Issue:** The slot key computation `${m.modelName}:${m.sourceId}:${i}` includes the array index `i`. If a model is removed from the middle of the list, models after the removed index will have their key change (because their index shifted). For example, removing index 1 from `[A, B, C]` produces `[A, C]` where C's key changes from `C:2` to `C:1`, causing React to unmount and remount C's ModelSelector. This is much better than pure index keys (the prior WR-04), but a truly stable key (e.g., a UUID assigned at slot creation time) would eliminate all unnecessary remounts.

**Fix:** Assign a stable unique ID when creating each slot:

```typescript
const nextSlotId = useRef(0);
const [selectedModels, setSelectedModels] = useState<{ model: ModelOption | null; slotId: number }[]>(
  initialSelected.map((m) => ({ model: m, slotId: nextSlotId.current++ }))
);
// In handleAdd:
return [...prev, { model: null, slotId: nextSlotId.current++ }];
// In JSX:
key={selected.slotId}
```

This is a minor quality improvement; the current approach works correctly in all cases but may cause brief ModelSelector state loss when removing middle items.

---

_Reviewed: 2026-06-15T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
