---
phase: 07-intelligence-analytics
reviewed: 2026-06-18T12:00:00Z
depth: deep
files_reviewed: 22
files_reviewed_list:
  - app/alerts/page.tsx
  - app/compare/page.tsx
  - app/components/AlertBanner.tsx
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
  - app/layout.tsx
  - app/lib/alerts.ts
  - app/promotions/page.tsx
  - app/trends/page.tsx
  - tests/components/alert-banner.test.tsx
  - tests/components/promotions-page.test.tsx
  - tests/components/trend-chart.test.tsx
  - tests/lib/alerts.test.ts
findings:
  critical: 2
  warning: 7
  info: 5
  total: 14
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-18T12:00:00Z
**Depth:** deep
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the intelligence-analytics layer covering the alerts system, comparison page, promotions page, trends page, and their shared components. Two critical issues were found: (1) the global AlertBanner in the root layout is rendered without its required `currentPrices` prop, making the entire alert notification feature non-functional in production, and (2) the promotions query in the compare page uses exact `inArray` matching against `modelPattern`, which fails to match any glob/regex-style patterns stored in the database. Seven warnings cover type safety gaps, unnecessary DB joins, test fragility, code duplication, and accessibility issues. Five informational items note style and maintainability concerns.

## Critical Issues

### CR-01: AlertBanner rendered without required `currentPrices` prop -- entire feature non-functional

**File:** `app/layout.tsx:22`
**Issue:** The root layout renders `<AlertBanner />` without passing the `currentPrices` prop. The `AlertBanner` component (`app/components/AlertBanner.tsx:19`) defaults `currentPrices` to `{}`, which means the `useEffect` at line 27 never finds any matching prices, and no alerts are ever triggered or displayed. The `currentPrices` object must be populated by the page/server and passed through, but the layout has no mechanism to receive or forward it. This renders the entire alert notification feature (D-16, D-17) dead in production.

**Fix:**
Either (a) fetch current prices in the layout server component and pass them as a prop:
```tsx
// app/layout.tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch current prices from DB
  const prices = await getCurrentPrices(); // implement this
  return (
    <html lang="en">
      <body>
        <TopNav />
        <div className="pt-14">{children}</div>
        <AlertBanner currentPrices={prices} />
      </body>
    </html>
  );
}
```
Or (b) make AlertBanner a client component that fetches its own prices via an API route or React context from a parent provider.

---

### CR-02: Promotions query uses exact match on `modelPattern` -- glob patterns never match model names

**File:** `app/compare/page.tsx:117`
**Issue:** The promotions query uses `inArray(promotions.modelPattern, modelNames)` to find promotions for selected models. However, `modelPattern` is a pattern field (intended for glob/regex matching, e.g., `"gpt-4*"`, `"claude-*"`), not an exact model name. An `inArray` check performs exact equality, so a promotion with `modelPattern: "gpt-4*"` will never match a selected model named `"gpt-4o"`. This means promotions and free tier data will almost always be empty in the comparison view.

**Fix:**
Either (a) fetch all promotions and filter client-side using a pattern matching function:
```typescript
// Fetch all promotions and filter client-side
const allPromos = await db.select({...}).from(promotions);
for (const promo of allPromos) {
  for (const modelName of modelNames) {
    if (matchesPattern(modelName, promo.modelPattern)) {
      if (!promotionsMap[modelName]) promotionsMap[modelName] = [];
      promotionsMap[modelName].push(promo);
    }
  }
}
```
Or (b) store exact model names alongside patterns in the promotions table and query against that column instead.

## Warnings

### WR-01: `pricingDataMap` typed as `Record<string, any>` -- bypasses TypeScript safety at component boundary

**File:** `app/compare/page.tsx:27`
**Issue:** The server component declares `pricingDataMap` as `Record<string, any>` (line 27), but the `ComparePageClient` component expects a precise type with `inputPricePer1m`, `outputPricePer1m`, `contextWindow`, `confidence`, and `sourceName` fields (lines 27-33). The `any` type defeats TypeScript's ability to catch missing or mistyped fields at the server/client boundary.

**Fix:**
```typescript
interface PricingDataEntry {
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: string;
  sourceName: string | null;
}
let pricingDataMap: Record<string, PricingDataEntry> = {};
```

---

### WR-02: TrendChart dot components use `any` props instead of typed interfaces

**File:** `app/components/TrendChart.tsx:37, 63, 87, 97`
**Issue:** `InputDot`, `OutputDot`, `ActiveDot`, and `FirstPointStar` all declare their props as `any`. Recharts passes specific props (`cx`, `cy`, `payload`, etc.) that should be typed to catch runtime errors at compile time.

**Fix:**
```typescript
interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  // other recharts props as needed
}

function InputDot(props: DotProps) {
  const { cx, cy, payload } = props;
  // ...
}
```

---

### WR-03: Unnecessary LEFT JOINs in database queries

**File:** `app/compare/page.tsx:116-117`, `app/promotions/page.tsx:30-31`
**Issue:** Both the promotions query in `compare/page.tsx` and the main query in `promotions/page.tsx` perform `leftJoin(sources, eq(promotions.sourceId, sources.id))`, but the `sources` table is not referenced in the SELECT clause and its data is never used. These are dead joins that add unnecessary query complexity and potential for NULL-related issues.

**Fix:**
```typescript
// Remove the unnecessary join
const promos = await db
  .select({
    id: promotions.id,
    modelPattern: promotions.modelPattern,
    // ... other fields
  })
  .from(promotions);
  // No join needed
```

---

### WR-04: `ComparisonCard` practical costs display shows model name instead of scenario name

**File:** `app/components/ComparisonCard.tsx:79-81`
**Issue:** The practical costs section maps each cost entry and displays `cost.modelName` as the label (line 80). However, in `compare/page.tsx` (lines 86-101), `cost.modelName` is the actual model name (e.g., "gpt-4o"), not the scenario name. This means every practical cost row shows the same model name instead of the scenario description (e.g., "10 long prompts", "1 coding session"). The `scenarioName` field from the database is discarded at line 91 when building the practical cost object.

**Fix:**
In `compare/page.tsx`, include the scenario name in the practical cost mapping:
```typescript
practicalCostsMap[cost.modelName].push({
  modelId: cost.extractionId,
  modelName: cost.scenarioName ?? cost.modelName, // Use scenario name
  sourceName: null,
  confidence: 'verified',
  inputPricePer1m: 0,
  outputPricePer1m: 0,
  inputCost: 0,
  outputCost: 0,
  totalCost: cost.estimatedCost,
});
```

---

### WR-05: `BellIcon` popup has no click-outside-to-close behavior

**File:** `app/components/BellIcon.tsx:75-115`
**Issue:** The alert form popup (`showForm`) is toggled only by clicking the bell button (line 54). There is no click-outside handler to close the popup. Once opened, the only way to close it is to click the bell icon again. This violates the common UX pattern where popups/dropdowns close when clicking outside, and can trap keyboard users.

**Fix:**
Add a click-outside handler similar to `ModelSelector`:
```typescript
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowForm(false);
    }
  }
  if (showForm) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showForm]);
```

---

### WR-06: Test uses hardcoded date that will cause test failure after 2026-06-10

**File:** `tests/components/promotions-page.test.tsx:25`
**Issue:** The mock promotion data uses `endDate: new Date('2026-06-10')` to represent an "expired" promotion. Since the `PromotionsPageClient` sorts by comparing `endDate` against `Date.now()`, this test relies on the current date being after 2026-06-10. If tests are run before that date, the "expired" promotion won't be expired, and the sort order assertion at lines 87-89 will fail.

**Fix:**
Use a dynamically computed past date:
```typescript
endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
```

---

### WR-07: Duplicate constant definitions across `PromotionCard` and `PromotionsList`

**File:** `app/components/PromotionCard.tsx:7-17`, `app/components/PromotionsList.tsx:17-21`
**Issue:** `typeBadgeStyles` and `typeLabels` are defined in both `PromotionCard.tsx` (lines 7-17) and `PromotionsList.tsx` (lines 17-21, where only `typeBadgeStyles` exists). These duplicate definitions risk diverging if one is updated and the other is not.

**Fix:**
Extract shared constants into a common file (e.g., `app/lib/promotion-constants.ts`):
```typescript
export const PROMOTION_BADGE_STYLES: Record<string, string> = {
  free_tier: 'bg-green-100 text-green-800',
  promotion: 'bg-blue-100 text-blue-800',
  beta: 'bg-purple-100 text-purple-800',
};
export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  free_tier: 'Free Tier',
  promotion: 'Promotion',
  beta: 'Beta',
};
```

## Info

### IN-01: `alerts.ts` does not validate structure of data read from localStorage

**File:** `app/lib/alerts.ts:26-27`
**Issue:** `getAlerts()` reads from localStorage and casts directly to `PriceAlert[]` via `as PriceAlert[]` without validating that each entry has the expected fields (`modelName`, `sourceId`, `thresholdPrice`, `createdAt`). A corrupted or manually edited localStorage entry could cause runtime errors in downstream consumers.

**Fix:**
Add a basic validation step after parsing:
```typescript
const parsed = JSON.parse(stored) as unknown;
if (!Array.isArray(parsed)) return [];
return parsed.filter((item): item is PriceAlert =>
  typeof item === 'object' && item !== null &&
  typeof item.modelName === 'string' &&
  typeof item.sourceId === 'number' &&
  typeof item.thresholdPrice === 'number'
);
```

---

### IN-02: `ModelSelector` input lacks `aria-label` for accessibility

**File:** `app/components/ModelSelector.tsx:67`
**Issue:** The search input for model selection has a visual `placeholder` but no `aria-label` or associated `<label>` element. Screen readers may not announce the purpose of this input.

**Fix:**
```tsx
<input
  type="text"
  aria-label="Search and select a model"
  // ... rest of props
/>
```

---

### IN-03: `BellIcon` popup lacks ARIA attributes for accessibility

**File:** `app/components/BellIcon.tsx:53, 75`
**Issue:** The bell button has a `title` but no `aria-expanded` attribute to indicate whether the popup is open. The popup form itself has no `role` or `aria-label`.

**Fix:**
```tsx
<button
  aria-expanded={showForm}
  aria-haspopup="true"
  // ... rest of props
>
```

---

### IN-04: `ComparePageClient` `handleAdd` appends a model with empty `modelName` and zero `sourceId`

**File:** `app/components/ComparePageClient.tsx:47`
**Issue:** When adding a new model slot, the component pushes `{ modelName: '', sourceId: 0, sourceName: '' }`. While this works functionally (the empty name is filtered out in display and URL update), using `sourceId: 0` could collide with a real source ID if one exists with value 0.

**Fix:**
Use a sentinel value or null to distinguish "no selection":
```typescript
const handleAdd = () => {
  if (selectedModels.length < 5) {
    setSelectedModels([...selectedModels, { modelName: '', sourceId: -1, sourceName: '' }]);
  }
};
```

---

### IN-05: TrendChart renders a duplicate hidden Line for star markers that may confuse legend or tooltip logic

**File:** `app/components/TrendChart.tsx:229-237`
**Issue:** A third `<Line>` element with `stroke="transparent"` and `legendType="none"` is rendered solely to position `FirstPointStar` dots. While `legendType="none"` hides it from the legend, Recharts may still include it in tooltip data, and the transparent stroke still participates in hit-testing.

**Fix:**
Consider using Recharts' `customized` prop or a `ReferenceDot` for the star marker instead of a hidden Line. Alternatively, document this pattern clearly for future maintainers.

---

_Reviewed: 2026-06-18T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

---

## Fixes Applied

**Fixed at:** 2026-06-18
**Fixer:** Claude (gsd-code-fixer)

### Critical Issues Fixed

**CR-01: AlertBanner rendered without required `currentPrices` prop**
- **Files modified:** `app/components/AlertBanner.tsx`, `app/layout.tsx`, `app/api/prices/route.ts` (new)
- **Fix:** Made AlertBanner a self-contained client component that fetches its own prices from a new `/api/prices` API route. Removed the `currentPrices` prop dependency. Added the AlertBanner back to `app/layout.tsx` (it had been removed). Created `app/api/prices/route.ts` that queries the latest extraction per model+source and returns a `modelName:sourceId` -> `inputPricePer1m` price map.
- **Status:** fixed

**CR-02: Promotions query uses exact match on `modelPattern`**
- **File modified:** `app/compare/page.tsx`
- **Fix:** Added a `matchesPattern()` helper that supports glob-style wildcards (e.g., `"gpt-4*"` matches `"gpt-4o"`). Changed the promotions query from `inArray(promotions.modelPattern, modelNames)` to fetching all promotions and filtering client-side using `matchesPattern()`. Promotions are now keyed by the matched model name rather than the pattern.
- **Status:** fixed

### Warnings Fixed

**WR-01: `pricingDataMap` typed as `Record<string, any>`**
- **Status:** already fixed (code was updated before this fix pass)

**WR-02: TrendChart dot components use `any` props**
- **File modified:** `app/components/TrendChart.tsx`
- **Fix:** Added a `RechartsDotProps` interface with `cx`, `cy`, `payload` fields and an index signature. Updated `InputDot`, `OutputDot`, `ActiveDot`, and `FirstPointStar` to use `RechartsDotProps` instead of `any`. Also typed the Tooltip formatter parameters.
- **Status:** fixed

**WR-03: Unnecessary LEFT JOINs in database queries**
- **Files modified:** `app/promotions/page.tsx`, `app/api/prices/route.ts` (new file also cleaned)
- **Fix:** Removed the `leftJoin(sources, eq(promotions.sourceId, sources.id))` from the promotions query in `promotions/page.tsx` since the `sources` table is not referenced in the SELECT clause. Also removed the unnecessary join from the new `/api/prices` route.
- **Status:** fixed

**WR-04: `ComparisonCard` practical costs display shows model name instead of scenario name**
- **File modified:** `app/compare/page.tsx`
- **Fix:** Changed `modelName: cost.modelName` to `modelName: cost.scenarioName ?? cost.modelName` in the practical costs mapping so scenario descriptions (e.g., "10 long prompts") are displayed instead of the model name.
- **Status:** fixed

**WR-05: `BellIcon` popup has no click-outside-to-close behavior**
- **File modified:** `app/components/BellIcon.tsx`
- **Fix:** Added `useRef` for a container reference and a `useEffect` with a `mousedown` listener that closes the popup when clicking outside. The listener is only active when `showForm` is true.
- **Status:** fixed

**WR-06: Test uses hardcoded date that will cause test failure after 2026-06-10**
- **File modified:** `tests/components/promotions-page.test.tsx`
- **Fix:** Changed `endDate: new Date('2026-06-10')` to `endDate: new Date(Date.now() - 24 * 60 * 60 * 1000)` so the expired promotion is always in the past regardless of when tests run.
- **Status:** fixed

**WR-07: Duplicate constant definitions across `PromotionCard` and `PromotionsList`**
- **Files modified:** `app/lib/promotion-constants.ts` (new), `app/components/PromotionCard.tsx`, `app/components/PromotionsList.tsx`
- **Fix:** Created `app/lib/promotion-constants.ts` with shared `PROMOTION_BADGE_STYLES` and `PROMOTION_TYPE_LABELS` constants. Updated both `PromotionCard.tsx` and `PromotionsList.tsx` to import from the shared file, removing their duplicate definitions.
- **Status:** fixed

### Info Issues Fixed

**IN-01: `alerts.ts` does not validate structure of data read from localStorage**
- **File modified:** `app/lib/alerts.ts`
- **Fix:** Added runtime validation after `JSON.parse`: checks that parsed data is an array and filters entries to only include objects with `modelName` (string), `sourceId` (number), and `thresholdPrice` (number) fields. Uses TypeScript type guard `(item): item is PriceAlert =>` for proper narrowing.
- **Status:** fixed

**IN-02: `ModelSelector` input lacks `aria-label` for accessibility**
- **File modified:** `app/components/ModelSelector.tsx`
- **Fix:** Added `aria-label="Search and select a model"` to the search input element.
- **Status:** fixed

**IN-03: `BellIcon` popup lacks ARIA attributes for accessibility**
- **File modified:** `app/components/BellIcon.tsx`
- **Fix:** Added `aria-expanded={showForm}` and `aria-haspopup="true"` to the bell button. Added `role="dialog"` and `aria-label="Price alert settings"` to the popup form container.
- **Status:** fixed

**IN-04: `ComparePageClient` `handleAdd` appends a model with empty `modelName` and zero `sourceId`**
- **File modified:** `app/components/ComparePageClient.tsx`
- **Fix:** Changed `sourceId: 0` to `sourceId: -1` to use a sentinel value that cannot collide with a real source ID.
- **Status:** fixed

**IN-05: TrendChart renders a duplicate hidden Line for star markers**
- **File modified:** `app/components/TrendChart.tsx`
- **Fix:** Added a detailed comment explaining the hidden Line pattern, its trade-offs (tooltip data inclusion, hit-testing), and the alternative approach (Recharts `<Customized>` or `<ReferenceDot>`).
- **Status:** fixed (documented)

### Summary

| Category | In Scope | Fixed | Skipped |
|----------|----------|-------|---------|
| Critical | 2 | 2 | 0 |
| Warning | 7 | 7 | 0 |
| Info | 5 | 5 | 0 |
| **Total** | **14** | **14** | **0** |

_Fixed: 2026-06-18_
_Fixer: Claude (gsd-code-fixer)_
