---
phase: 07-intelligence-analytics
reviewed: 2026-06-15T18:00:00Z
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
  critical: 3
  warning: 6
  info: 5
  total: 14
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-15T18:00:00Z
**Depth:** deep
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Phase 7 adds the Intelligence & Analytics features: pricing trends, model comparison, promotions listing, and client-side price alerts via localStorage. The review focused on cross-file contract consistency, SSR hydration safety, URL synchronization logic, and data flow between server and client components.

Three critical issues were found: (1) a logic bug where wildcard promotion patterns cannot be matched during the DB query in the compare page, making wildcard promotions permanently invisible; (2) an unsafe `null as unknown as ModelOption` cast that violates TypeScript safety and introduces runtime risk; (3) a nested setTimeout in AlertBanner without cleanup that leaks timers on unmount. Six warnings and five info items round out the findings.

## Critical Issues

### CR-01: Wildcard promotion patterns silently dropped in compare page

**File:** `app/compare/page.tsx:186-200`

**Issue:** The promotions query fetches promotions using `inArray(promotions.modelPattern, modelNames)`, which only matches exact string equality. The wildcard pattern matching logic at lines 197-200 (e.g., `gpt-*` matching `gpt-4o`) is dead code because the DB query already filtered out any promotion whose `modelPattern` is `gpt-*` -- it would only be returned if the user literally typed `gpt-*` in the URL. Any promotion stored with a wildcard pattern will never appear on the compare page.

**Fix:** Fetch all promotions (or all promotions whose pattern is a prefix match) and let the application-layer wildcard logic do the filtering:

```typescript
// Replace the inArray query with a broader fetch:
const promoRows = await db
  .select()
  .from(promotions);

// Then filter in application code using the existing wildcard logic:
for (const row of promoRows) {
  for (const modelName of modelNames) {
    if (
      row.modelPattern === modelName ||
      row.modelPattern === '*' ||
      (row.modelPattern.endsWith('*') &&
        modelName.startsWith(row.modelPattern.slice(0, -1)))
    ) {
      // ... existing push logic
    }
  }
}
```

Also add parentheses around the `||` conditions for clarity and to prevent future precedence mistakes.

---

### CR-02: Unsafe `null as unknown as ModelOption` cast

**File:** `app/components/ComparePageClient.tsx:64`

**Issue:** `handleAdd` pushes `null as unknown as ModelOption` into the `selectedModels` array. This double-cast bypasses TypeScript's type system entirely. The rest of the code handles this via `.filter((m): m is ModelOption => m !== null)` guards, but any future code that accesses `selectedModels[i]` without a null check will crash at runtime. The type signature `useState<ModelOption[]>(initialSelected)` lies -- the array actually contains `(ModelOption | null)[]`.

**Fix:** Change the state type to reflect reality:

```typescript
const [selectedModels, setSelectedModels] =
  useState<(ModelOption | null)[]>(initialSelected);
```

This makes all downstream null checks explicit and type-safe, and allows TypeScript to catch missing guards.

---

### CR-03: Nested setTimeout without cleanup in AlertBanner

**File:** `app/components/AlertBanner.tsx:58-66`

**Issue:** The auto-dismiss effect schedules a 10s timeout, which itself schedules a 300ms inner timeout. The cleanup function only clears the outer timeout. If the component unmounts during the 300ms fade window, the inner `setTimeout` fires and calls `setVisible(false)` and `setFading(false)` on an unmounted component. The same pattern exists in `dismissAlert` (line 74) and `dismissAll` (line 85). While React 18 no longer warns about setState on unmounted components, the leaked timers are still a resource waste and can cause visual glitches if the component remounts.

**Fix:** Track both timeout IDs and clear both on cleanup:

```typescript
useEffect(() => {
  if (!visible) return;

  let fadeTimeout: ReturnType<typeof setTimeout>;
  let hideTimeout: ReturnType<typeof setTimeout>;

  fadeTimeout = setTimeout(() => {
    setFading(true);
    hideTimeout = setTimeout(() => {
      setVisible(false);
      setFading(false);
    }, 300);
  }, 10_000);

  return () => {
    clearTimeout(fadeTimeout);
    clearTimeout(hideTimeout);
  };
}, [visible]);
```

Apply the same pattern to `dismissAlert` and `dismissAll` by extracting a shared `startFadeOut` helper.

---

## Warnings

### WR-01: Stale closure in ComparePageClient callbacks

**File:** `app/components/ComparePageClient.tsx:52-76`

**Issue:** `handleSelect`, `handleAdd`, and `handleRemove` all use `useCallback` with `selectedModels` as a dependency. Since `selectedModels` changes on every selection, these callbacks are recreated on every render, defeating memoization. Worse, the pattern `[...selectedModels]` creates a shallow copy from the closure's snapshot, so rapid clicks could lose updates if React batches state changes.

**Fix:** Use a functional state updater pattern to avoid the stale closure:

```typescript
const handleSelect = useCallback(
  (index: number, model: ModelOption) => {
    setSelectedModels((prev) => {
      const next = [...prev];
      next[index] = model;
      syncUrl(next);
      return next;
    });
  },
  [syncUrl],
);
```

---

### WR-02: Duplicated `isPromoActive` logic across modules

**File:** `app/components/PromotionCard.tsx:23-27` and `app/components/PromotionsPageClient.tsx:15-18`

**Issue:** Both files define an `isActive`/`isPromoActive` function with identical logic but different names. If the date comparison logic ever changes (e.g., timezone handling), one could be updated and the other forgotten, leading to inconsistent active/expired status display between the filter sort order and the card visual.

**Fix:** Extract to a shared utility:

```typescript
// app/lib/promotion-utils.ts
export function isPromoActive(endDate: Date | null): boolean {
  if (endDate === null) return true;
  return new Date(endDate).getTime() > Date.now();
}
```

---

### WR-03: Layout DB query fetches all extractions with no LIMIT

**File:** `app/layout.tsx:31-41`

**Issue:** When `has_alerts` cookie is set, the layout query fetches ALL rows from the `extractions` table (no LIMIT, no WHERE clause beyond ordering), then deduplicates in application code. The comment says "DISTINCT ON" but the code uses manual `Set`-based deduplication. As the database grows (30+ providers, daily collections), this query will return thousands of rows on every page navigation, causing unnecessary DB load and memory usage.

**Fix:** Use Drizzle's `distinctOn` to get only the latest row per model+source at the SQL level:

```typescript
const rows = await db
  .selectDistinctOn([extractions.modelName, extractions.sourceId], {
    modelName: extractions.modelName,
    sourceId: extractions.sourceId,
    inputPricePer1m: extractions.inputPricePer1m,
  })
  .from(extractions)
  .orderBy(
    extractions.modelName,
    extractions.sourceId,
    desc(extractions.collectedAt),
  );
```

---

### WR-04: Unstable array-index keys in compare page model grid

**File:** `app/components/ComparePageClient.tsx:107`

**Issue:** `{selectedModels.map((selected, index) => <div key={index}> ...)}` uses array index as the React key. When a model is removed from the middle of the list, React reuses DOM nodes incorrectly -- the ModelSelector input state (open/closed, query text) from the removed slot bleeds into the next model's slot. This causes visual glitches and stale input values.

**Fix:** Assign a stable ID to each model slot:

```typescript
const [selectedModels, setSelectedModels] = useState<...>(() =>
  initialSelected.map((m, i) => ({ ...m, slotId: `slot-${i}` }))
);
// Then use slotId as key
```

---

### WR-05: Alert dimension mismatch -- only input price checked

**File:** `app/layout.tsx:34-48` and `app/components/AlertBanner.tsx:37-39`

**Issue:** The layout query only fetches `inputPricePer1m`. The AlertBanner compares `currentPrices[key]` against `alert.thresholdPrice`. But the `AlertSetForm` passes `model.inputPricePer1m` as `currentPrice` to `BellIcon`, establishing the convention that alerts are for input price. However, this is never documented in the alert data structure (`PriceAlert` has no `dimension` field). If a user expects to set an output price alert, the system silently checks input price instead. This is a UX correctness issue.

**Fix:** Either add a `dimension: 'input' | 'output'` field to `PriceAlert`, or clearly label the form as "Input price alert" and add a selector for output price alerts in a future iteration.

---

### WR-06: PromotionCard renders unsanitized scraped data

**File:** `app/components/PromotionCard.tsx:74`

**Issue:** `{promo.description}` is rendered directly. While React auto-escapes text content (no XSS via `innerHTML`), the description comes from web scraping and could contain visually deceptive Unicode characters (same class of bidi/zero-width attacks that `sanitizeDisplayName` guards against). An attacker could craft a scraped description that visually resembles a different model name or price to mislead users.

**Fix:** Apply `sanitizeDisplayName` (or a similar sanitizer) to `promo.description` before rendering, or create a `sanitizeText` utility for all scraped content.

---

## Info

### IN-01: Misleading "DISTINCT ON" comment in layout

**File:** `app/layout.tsx:29`

**Issue:** Comment says "Query latest price per model+source using DISTINCT ON" but the implementation uses manual `Set`-based deduplication with no `DISTINCT ON` SQL clause. This misleads future maintainers about the query strategy.

**Fix:** Update comment to: "Query all extractions, deduplicate in application code to keep latest per model+source."

---

### IN-02: Model names with special characters could produce invalid HTML IDs

**File:** `app/components/AlertSetForm.tsx:84`

**Issue:** `id={`threshold-${modelName}-${sourceId}`}` uses raw `modelName` in the HTML `id` attribute. Model names containing spaces, dots, or special characters (e.g., `GPT-4o mini`) produce invalid HTML IDs. While browsers tolerate this, it breaks `document.getElementById()` and accessibility tools.

**Fix:** Slugify the model name for use in HTML IDs:

```typescript
const slugId = `threshold-${modelName.replace(/[^a-zA-Z0-9]/g, '-')}-${sourceId}`;
```

---

### IN-03: `costMap` is computed but never used in ComparisonCard

**File:** `app/components/ComparisonCard.tsx:47-53`

**Issue:** The `costMap` variable is built from `practicalCosts` but is never referenced. The actual cost lookup at lines 109-113 uses a direct `.find()` instead. This is dead code -- likely a leftover from a refactor.

**Fix:** Remove the unused `costMap` block (lines 47-53).

---

### IN-04: Two nearly identical promotion type badge style maps

**File:** `app/components/ComparisonCard.tsx:23-33`, `app/components/PromotionCard.tsx:17-21`, `app/components/PromotionsList.tsx:17-21`

**Issue:** Three separate files define `PROMO_BADGE_STYLES`/`typeBadgeStyles` with identical content. This is a minor DRY violation.

**Fix:** Extract to a shared constant in `app/lib/promotion-utils.ts`.

---

### IN-05: Double top-padding on alerts page

**File:** `app/alerts/page.tsx:12`

**Issue:** The alerts page applies `pt-14` to its `<main>` element. The root layout (`app/layout.tsx:64`) already wraps children in `<div className="pt-14">{children}</div>`. This results in double padding (56px + 56px = 112px) on the alerts page, pushing content further down than intended. The compare, promotions, and trends pages do not have this extra `pt-14`, confirming the layout wrapper is the intended source.

**Fix:** Remove `pt-14` from the alerts page:

```tsx
<main className="min-h-screen bg-white text-gray-900">
```

---

_Reviewed: 2026-06-15T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
