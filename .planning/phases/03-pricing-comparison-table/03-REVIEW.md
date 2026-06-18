---
phase: 03-pricing-comparison-table
reviewed: 2026-06-18T18:30:00Z
depth: deep
files_reviewed: 6
files_reviewed_list:
  - app/compare/page.tsx
  - app/components/CostCalculator.tsx
  - app/components/HomePageClient.tsx
  - app/components/PricingTable.tsx
  - app/components/TrendChart.tsx
  - app/page.tsx
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-18T18:30:00Z
**Depth:** deep
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed 6 source files comprising the pricing comparison table, cost calculator, trend chart, home page, and compare page. The code is well-structured with clean separation between server and client components, good use of `@tanstack/react-table`, and thoughtful accessibility (ARIA roles/labels). However, two critical issues were found: the price range filters are broken when currency is toggled to VND (filter labels say USD but table shows VND, so the filter operates on the wrong scale), and timestamps are rendered in server timezone rather than the user's local timezone. Additional warnings cover type safety gaps, NaN handling in filters, and missing memoization in the compare page.

## Critical Issues

### CR-01: Price filter inputs ignore currency mode -- filters broken when VND selected

**File:** `app/components/PricingTable.tsx:512-587`
**Issue:** The advanced price filter inputs have hardcoded labels "Input Price ($/1M)" and "Output Price ($/1M)" (lines 512, 537) and accept raw numeric values. When the user switches the currency toggle to VND, the table displays prices in VND (via `formatCurrencyPrice` with `effectiveCurrency`), but the filter logic in `preFilteredData` (lines 184-205) compares the raw `row.inputPricePer1m` and `row.outputPricePer1m` values (which are always stored in USD) against the user-entered filter values. A user filtering "Min: 100" in VND mode intends 100 VND, but the filter compares against 100 USD (the raw value), which is ~2550x larger than intended. The filter is silently wrong whenever currency is VND.

**Fix:** Either (a) convert filter values to USD before comparison when currency is VND, or (b) label the inputs with the correct currency and convert appropriately:

```tsx
// Option A: Convert filter values to USD for comparison (recommended)
const inputMinRaw = inputPriceMin !== '' ? parseFloat(inputPriceMin) : null;
const inputMaxRaw = inputPriceMax !== '' ? parseFloat(inputPriceMax) : null;
const inputMin = (inputMinRaw !== null && effectiveCurrency === 'vnd' && exchangeRate)
  ? inputMinRaw / exchangeRate : inputMinRaw;
const inputMax = (inputMaxRaw !== null && effectiveCurrency === 'vnd' && exchangeRate)
  ? inputMaxRaw / exchangeRate : inputMaxRaw;

// And update labels to show current currency:
<legend>Input Price ({effectiveCurrency === 'usd' ? '$/1M' : '₫/1M'})</legend>
```

### CR-02: Server-side timestamp display uses server timezone, not user timezone

**File:** `app/page.tsx:75`
**Issue:** `format(lastUpdated, 'MMM d, yyyy h:mm a')` uses `date-fns` `format()`, which operates in the server's local timezone (or UTC in Docker). The "Last updated" timestamp on the public landing page will be incorrect for users in different timezones. For a Vietnamese-audience site where the server may run in UTC, users would see times that are 7 hours behind their local time, causing confusion about data freshness.

**Fix:** Use UTC display or include timezone offset so the time is unambiguous:

```tsx
// Option A: Display in UTC with explicit label
<p>Last updated: {lastUpdated ? format(lastUpdated, "MMM d, yyyy HH:mm") + ' UTC' : 'Unknown'}</p>

// Option B: Use ISO format which is timezone-unambiguous
<p>Last updated: {lastUpdated ? lastUpdated.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'Unknown'}</p>
```

## Warnings

### WR-01: `pricingDataMap` typed as `Record<string, any>` -- bypasses type safety

**File:** `app/compare/page.tsx:28`
**Issue:** `pricingDataMap` is declared as `Record<string, any>`, which disables TypeScript checking on all downstream accesses. The `ComparePageClient` component (line 27-33 of ComparePageClient.tsx) expects a specific shape with `inputPricePer1m`, `outputPricePer1m`, `contextWindow`, `confidence`, and `sourceName`. If the schema changes or a field is renamed, the `any` type will not catch the mismatch, leading to silent runtime failures.

**Fix:** Define and use a concrete type:

```tsx
interface PricingDataEntry {
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  sourceName: string | null;
}
let pricingDataMap: Record<string, PricingDataEntry> = {};
```

### WR-02: Price filter does not guard against NaN from `parseFloat`

**File:** `app/components/PricingTable.tsx:184-205`
**Issue:** The price filter uses `parseFloat(inputPriceMin)` after checking `inputPriceMin !== ''`. While `<input type="number" />` largely prevents non-numeric input, the `value` attribute is a string state variable that could theoretically contain non-numeric text (e.g., pasted content). `parseFloat('abc')` returns `NaN`, and since `NaN !== null` is `true`, the filter condition `if (inputMin !== null && row.inputPricePer1m < inputMin)` evaluates to `false` for all rows (NaN comparisons always return false), silently passing all rows through the filter.

**Fix:** Add NaN guard after parseFloat:

```tsx
const rawInputMin = inputPriceMin !== '' ? parseFloat(inputPriceMin) : null;
const inputMin = rawInputMin !== null && !Number.isNaN(rawInputMin) ? rawInputMin : null;
```

### WR-03: `ComparisonCard` accepts `confidence: string` -- loose type allows invalid values

**File:** `app/components/ComparisonCard.tsx:29`
**Issue:** The `confidence` prop is typed as `string` instead of `'verified' | 'likely' | 'low_confidence'`. This means `ComparePageClient` can pass any string (including the hardcoded `'low_confidence'` fallback on line 133), and the `.replace('_', ' ')` call on line 42 will process arbitrary strings. More importantly, the `getConfidenceColor()` function in `pricing-utils.ts` only handles three known values -- any other string silently falls through to the default gray styling. While not a runtime crash, this undermines the value of TypeScript's type system.

**Fix:** Import and use the shared confidence type:

```tsx
type ConfidenceLevel = 'verified' | 'likely' | 'low_confidence';
// ...
confidence: ConfidenceLevel;
```

### WR-04: Practical costs map in compare page hardcodes `'verified'` confidence

**File:** `app/compare/page.tsx:93-101`
**Issue:** When building `practicalCostsMap`, every cost entry is assigned `confidence: 'verified'` (line 95) regardless of the actual extraction's confidence level. A model with `low_confidence` extraction data will show as "verified" in the comparison card's practical costs section, misleading users about data reliability.

**Fix:** Join the confidence from the extraction query and propagate it:

```tsx
const costs = await db
  .select({
    // ... existing fields
    confidence: extractions.confidence,  // add this
  })
  .from(practicalCosts)
  // ...

// Then in the loop:
practicalCostsMap[cost.modelName].push({
  // ...
  confidence: cost.confidence ?? 'low_confidence',
});
```

### WR-05: `ComparePageClient` filters selected models 3 times per render

**File:** `app/components/ComparePageClient.tsx:108, 115, 124`
**Issue:** `selectedModels.filter((m) => m.modelName)` is called three separate times in the JSX: once to check if length is 0 (line 108), once to check if length is 1 (line 115), and once to render the comparison cards (line 124). Each call iterates the entire array and creates a new array object. While not a correctness bug, this is a missed memoization opportunity that causes unnecessary work on every render, especially relevant since this is a client component that re-renders on every model selection change.

**Fix:** Memoize the filtered list:

```tsx
const validModels = useMemo(
  () => selectedModels.filter((m) => m.modelName),
  [selectedModels]
);
```

### WR-06: `autoResetPageIndex: true` causes misleading "Page 1 of 1" flash

**File:** `app/components/PricingTable.tsx:376`
**Issue:** `autoResetPageIndex: true` resets the pagination index to 0 whenever `preFilteredData` changes. Combined with TanStack Table's internal update cycle, this can cause the page indicator to briefly show "Page 1 of 1" before the filtered row count is recalculated, creating a visual flash. This is especially noticeable when toggling the "Free tier only" checkbox, which dramatically changes the dataset size.

**Fix:** Either remove `autoResetPageIndex` and handle pagination reset manually in the filter state setters, or accept the brief flash as cosmetic:

```tsx
// Option: Manual reset in clearFilters and filter setters
const handleFreeTierChange = (checked: boolean) => {
  setFreeTierOnly(checked);
  table.setPageIndex(0);  // explicit reset
};
```

## Info

### IN-01: Recharts `Tooltip` formatter uses untyped `any` parameters

**File:** `app/components/TrendChart.tsx:204-207`
**Issue:** The `Tooltip` `formatter` callback uses `(value: any, name: any)` instead of typed parameters. This is a minor type safety gap that could mask bugs if the tooltip data shape changes.

**Fix:** Use `number | string` or Recharts' exported types:

```tsx
formatter={(value: number | string, name: string) => [
  `$${typeof value === 'number' ? value.toFixed(4) : value}`,
  name,
]}
```

### IN-02: Custom dot components in TrendChart use `props: any`

**File:** `app/components/TrendChart.tsx:37, 63, 87, 97`
**Issue:** `InputDot`, `OutputDot`, `ActiveDot`, and `FirstPointStar` all use `props: any`, bypassing type checking for the Recharts dot component props. This makes it easy to accidentally access undefined properties without compile-time warnings.

**Fix:** Define an interface for the dot props:

```tsx
interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  // ... other Recharts dot props as needed
}
function InputDot(props: DotProps) { /* ... */ }
```

### IN-03: Duplicate filter computation in `ComparePageClient` (see WR-05)

**File:** `app/components/ComparePageClient.tsx:108, 115, 124`
**Issue:** Same as WR-05 -- listed here as informational since the performance impact is minor for small arrays (max 5 models).

### IN-04: Module-level row model factories in PricingTable are correct

**File:** `app/components/PricingTable.tsx:25-28`
**Issue:** `coreRowModel`, `sortedRowModel`, `filteredRowModel`, `paginationRowModel` are created at module level. This is the correct pattern per TanStack Table documentation -- these are stateless factory functions, not expensive computations. No action needed.

---

_Reviewed: 2026-06-18T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

## Fixes Applied

**Applied:** 2026-06-18
**Fixer:** Claude (gsd-code-fixer)

### Summary

- Findings in scope: 12 (2 Critical, 6 Warning, 4 Info)
- Fixed: 8
- Already fixed (pre-existing): 3 (WR-02, IN-01, IN-02)
- Not applicable: 1 (IN-04 -- informational, no action needed)
- Skipped: 1 (WR-06 -- cosmetic issue, accepted as-is)

### CR-01: Price filter inputs ignore currency mode -- FIXED

**File:** `app/components/PricingTable.tsx`
**Changes:**
- Added VND-to-USD conversion in price filter logic: when `effectiveCurrency === 'vnd'` and `exchangeRate` is available, filter values entered by the user are divided by the exchange rate before comparison against the USD-stored row prices.
- Updated `useMemo` dependency array to include `effectiveCurrency` and `exchangeRate`.
- Updated filter legend labels from hardcoded `$/1M` to dynamic `{effectiveCurrency === 'usd' ? '$/1M' : '₫/1M'}` for both Input Price and Output Price fieldsets.

### CR-02: Server-side timestamp display uses server timezone -- FIXED

**File:** `app/page.tsx`
**Changes:**
- Replaced `format(lastUpdated, 'MMM d, yyyy h:mm a')` with `lastUpdated.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'` to display an unambiguous UTC timestamp.
- Removed unused `format` import from `date-fns`.

### WR-01: `pricingDataMap` typed as `Record<string, any>` -- FIXED

**File:** `app/compare/page.tsx`
**Changes:**
- Replaced `Record<string, any>` with a concrete type definition including `inputPricePer1m`, `outputPricePer1m`, `contextWindow`, `confidence` (with union type `'verified' | 'likely' | 'low_confidence'`), `sourceName`, and `collectedAt`.

### WR-02: Price filter does not guard against NaN -- ALREADY FIXED

**File:** `app/components/PricingTable.tsx`
**Status:** The NaN guard using `Number.isFinite()` and `>= 0` checks was already present in the codebase prior to this fix session.

### WR-03: `ComparisonCard` accepts `confidence: string` -- FIXED

**Files:** `app/components/ComparisonCard.tsx`, `app/components/ComparePageClient.tsx`
**Changes:**
- Changed `confidence: string` to `confidence: 'verified' | 'likely' | 'low_confidence'` in `ComparisonCard` props type.
- Updated `pricingDataMap` prop type in `ComparePageClient` to use the same union type for `confidence`.

### WR-04: Practical costs map hardcodes 'verified' confidence -- FIXED

**File:** `app/compare/page.tsx`
**Changes:**
- Added `confidence: extractions.confidence` to the practical costs SQL query select fields.
- Changed hardcoded `confidence: 'verified'` to `confidence: cost.confidence ?? 'low_confidence'` in the practical costs map building loop.

### WR-05: `ComparePageClient` filters selected models 3 times per render -- FIXED

**File:** `app/components/ComparePageClient.tsx`
**Changes:**
- Added `useMemo` import from React.
- Created `validModels` memoized value: `useMemo(() => selectedModels.filter((m) => m.modelName), [selectedModels])`.
- Replaced all three `selectedModels.filter((m) => m.modelName)` calls in JSX with `validModels`.

### WR-06: `autoResetPageIndex: true` causes "Page 1 of 1" flash -- NOT FIXED (accepted)

**File:** `app/components/PricingTable.tsx`
**Reason:** This is a cosmetic issue. The alternative (manual page reset in each filter setter) would require significant refactoring of the component structure since `table` is created after the filter state setters. The brief flash is acceptable for the current use case.

### IN-01: Recharts `Tooltip` formatter uses untyped `any` -- ALREADY FIXED

**File:** `app/components/TrendChart.tsx`
**Status:** The Tooltip formatter already uses `string | number | (string | number)[]` type instead of `any`.

### IN-02: Custom dot components use `props: any` -- ALREADY FIXED

**File:** `app/components/TrendChart.tsx`
**Status:** A `RechartsDotProps` interface was already defined and used by all dot components (`InputDot`, `OutputDot`, `ActiveDot`, `FirstPointStar`).

### IN-03: Duplicate filter computation (see WR-05) -- FIXED

**Status:** Resolved by WR-05 fix (memoized `validModels`).

### IN-04: Module-level row model factories -- NO ACTION

**Status:** Informational. The pattern is correct per TanStack Table documentation. No fix needed.
