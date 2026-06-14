---
phase: 05-model-detail-pages
reviewed: 2026-06-14T18:30:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - app/components/ModelDetailClient.tsx
  - app/components/PriceHistoryChart.tsx
  - app/components/PricingGrid.tsx
  - app/components/PricingTable.tsx
  - app/components/PromotionsList.tsx
  - app/components/ProviderLinks.tsx
  - app/lib/provider-links.ts
  - app/lib/slug.ts
  - app/lib/slug-utils.ts
  - app/model/[slug]/page.tsx
  - app/page.tsx
  - src/db/schema.ts
  - tests/slug.test.ts
  - tests/components/price-history-chart.test.tsx
  - tests/components/pricing-grid.test.tsx
  - tests/components/promotions-list.test.tsx
  - tests/components/provider-links.test.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-14T18:30:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the model detail pages implementation including the `/model/[slug]` route, detail client component, pricing grid, price history chart, promotions list, provider links, slug utilities, database schema, and all associated tests. The implementation is well-structured with clear separation between server and client components, proper use of ISR, and good defensive coding (null-safe rendering, URL validation in PricingTable). Two critical issues were found in the database schema that will cause incorrect data storage/display. Five warnings cover error handling gaps and UX issues.

## Critical Issues

### CR-01: PostgreSQL `real` type causes floating-point rounding for pricing and exchange rate columns

**File:** `src/db/schema.ts:54-55, 89, 129`
**Issue:** The `extractions.inputPricePer1m`, `extractions.outputPricePer1m`, `exchangeRates.rate`, and `practicalCosts.estimatedCost` columns use PostgreSQL's `real` type (4-byte IEEE 754 single precision, ~7 significant digits). This causes rounding on storage and retrieval. For example, storing `0.0025` may retrieve as `0.002500000176...`. For exchange rates around 25500, the relative precision loss is small (~0.0003%), but for sub-cent per-token prices (e.g., `$0.0000025`), the rounding is significant enough to alter displayed values. Currency values should use `numeric` (arbitrary precision) to guarantee exact decimal representation.

**Fix:**
```typescript
// src/db/schema.ts — change real to numeric for all currency/price columns

// extractions table
inputPricePer1m: numeric('input_price_per_1m'),   // was: real('input_price_per_1m')
outputPricePer1m: numeric('output_price_per_1m'), // was: real('output_price_per_1m')

// exchangeRates table
rate: numeric('rate').notNull(),                   // was: real('rate').notNull()

// practicalCosts table
estimatedCost: numeric('estimated_cost').notNull(), // was: real('estimated_cost').notNull()
```

Note: Changing column types requires a migration. If this is a new schema not yet deployed, the change is safe. If data already exists, `ALTER TABLE ... ALTER COLUMN ... TYPE numeric` is needed.

---

### CR-02: `sourceUrl` in PromotionsList rendered without protocol validation — potential XSS via `javascript:` URLs

**File:** `app/components/PromotionsList.tsx:87-93`
**Issue:** The `PromotionsList` component renders `promo.sourceUrl` directly in an `<a href>` tag without validating the URL protocol. If a promotion's `sourceUrl` is set to `javascript:alert(document.cookie)` or similar, clicking the link would execute arbitrary JavaScript in the user's browser. This contrasts with `PricingTable.tsx` (lines 314-319) which correctly validates the URL protocol before rendering. Since `sourceUrl` comes from the database and may be populated by an admin or automated pipeline, it should be sanitized.

**Fix:**
```typescript
// app/components/PromotionsList.tsx — add URL validation before rendering
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// In the JSX, replace the unconditional sourceUrl rendering:
{promo.sourceUrl && isSafeUrl(promo.sourceUrl) && (
  <a
    href={promo.sourceUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-blue-600 hover:text-blue-800 underline"
  >
    View details
  </a>
)}
```

## Warnings

### WR-01: Model detail page main queries have no try/catch — unhandled DB errors cause 500

**File:** `app/model/[slug]/page.tsx:64-86, 93-106`
**Issue:** The two main database queries (latest extraction and price history) are not wrapped in try/catch blocks. The promotions query (line 120) and exchange rate fetch (line 142) correctly have try/catch with fallbacks. If the `extractions` or `sources` tables are temporarily unavailable or a query fails, the page will throw an unhandled error resulting in a 500 response instead of a graceful fallback. During ISR revalidation, a transient DB failure would break the page until the next successful build.

**Fix:**
```typescript
// Wrap the main queries in try/catch with notFound() fallback
let latest, history;
try {
  [latest] = await db
    .select({ /* ... */ })
    .from(extractions)
    .leftJoin(sources, eq(extractions.sourceId, sources.id))
    .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
    .orderBy(desc(extractions.collectedAt))
    .limit(1);

  history = await db
    .select({ /* ... */ })
    .from(extractions)
    .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
    .orderBy(extractions.collectedAt);
} catch {
  notFound();
}

if (!latest) {
  notFound();
}
```

### WR-02: `resolveSlug` silently swallows all errors — makes debugging slug resolution failures impossible

**File:** `app/lib/slug.ts:38-40`
**Issue:** The catch block in `resolveSlug` catches all exceptions with no logging. If the database query fails due to a schema mismatch, connection issue, or query error, the function returns `null` which triggers `notFound()` on the model detail page. There is no way to distinguish "slug doesn't exist" from "database is broken." This makes debugging production issues extremely difficult. The same pattern exists in `generateStaticParams` (page.tsx:33) but is more acceptable there since it runs at build time.

**Fix:**
```typescript
// app/lib/slug.ts — add console.warn for debugging
} catch (err) {
  // DB unavailable — log but return null
  console.warn('resolveSlug: DB query failed:', err);
  return null;
}
```

### WR-03: Price history empty state message is misleading when 1 data point exists

**File:** `app/components/PriceHistoryChart.tsx:32-38`
**Issue:** When `chartData.length` is exactly 1 (after filtering nulls), the component shows "Price history will appear after multiple data collections." This is misleading — there IS one data point already collected. The message should acknowledge the existing data and indicate that a second collection is needed for a trend line.

**Fix:**
```typescript
// app/components/PriceHistoryChart.tsx
if (chartData.length === 0) {
  return (
    <div className="text-center py-8 text-gray-500">
      No pricing data available yet.
    </div>
  );
}

if (chartData.length < 2) {
  return (
    <div className="text-center py-8 text-gray-500">
      Price trend chart will appear after the next data collection.
    </div>
  );
}
```

### WR-04: VND display can show "NaN" if exchangeRate is NaN

**File:** `app/components/PricingTable.tsx:149,273`
**Issue:** The `exchangeRate` prop is declared as `exchangeRate?: number` (optional), making it `number | undefined`. If a caller passes `NaN` (e.g., from a corrupted DB value), `formatCurrencyPrice` would compute `NaN * 25500` (or `price * NaN`), which propagates through `Math.round` to `NaN`, and `toLocaleString('vi-VN')` renders `"NaN"`. While the current `page.tsx` always provides a valid number (FALLBACK_RATE), the defensive gap exists at the component boundary.

**Fix:**
```typescript
// app/lib/pricing-utils.ts — guard against NaN in convertToVND
export function convertToVND(price: number | null | undefined, rate?: number): number | null {
  if (price === null || price === undefined || Number.isNaN(price)) return null;
  const effectiveRate = rate ?? USD_VND_RATE;
  if (Number.isNaN(effectiveRate) || effectiveRate <= 0) return null;
  return price * effectiveRate;
}
```

### WR-05: `storeRate` deduplication checks rate value but not date — prevents same-rate storage on different days

**File:** `src/pipeline/exchange-rate-worker.ts:82-111`
**Issue:** The `storeRate` function's comment says "Skips insertion if a rate with the same value was already fetched today" but the query (lines 87-98) only checks `(fromCurrency, toCurrency, rate)` without filtering by date. If the exchange rate is identical on consecutive days, the second day's fetch will be silently skipped, creating gaps in the historical rate data. This affects the rate history over time.

**Fix:**
```typescript
// src/pipeline/exchange-rate-worker.ts — add date filter to dedup query
const today = new Date();
today.setHours(0, 0, 0, 0);

const existing = await db
  .select({ id: exchangeRates.id })
  .from(exchangeRates)
  .where(
    and(
      eq(exchangeRates.fromCurrency, 'USD'),
      eq(exchangeRates.toCurrency, 'VND'),
      eq(exchangeRates.rate, rate),
      gte(exchangeRates.fetchedAt, today),  // <-- add date filter
    )
  )
  .limit(1);
```

## Info

### IN-01: Redundant `new Date()` wrapping for already-Date values in server component

**File:** `app/model/[slug]/page.tsx:148-156`
**Issue:** Lines 148-155 wrap `latest.collectedAt` and history `collectedAt` in `new Date()` before passing to the client component. Since Drizzle's `timestamp` column type already returns JavaScript `Date` objects, `new Date(dateObj)` simply creates a copy. This is not incorrect but adds unnecessary allocations. For consistency with `app/page.tsx` (which also does this at line 49), this is acceptable but could be cleaned up.

### IN-02: Provider resources section renders empty div when providerName is empty string

**File:** `app/components/ModelDetailClient.tsx:166-169`
**Issue:** When `model.sourceName` is null, the component passes `providerName={model.sourceName ?? ''}` (empty string) to `ProviderLinks`. The `getProviderLinks('')` function will look up `''` in the map and return `null`. If `sourceUrl` is also null, the component returns `null` (renders nothing). If `sourceUrl` is present, only the "Pricing Page" link shows. The section header "Provider Resources" will still render with an empty body if both are null, leaving a visible but empty section.

### IN-03: PricingTable duplicates currency toggle logic with ModelDetailClient

**File:** `app/components/PricingTable.tsx:161-163` and `app/components/ModelDetailClient.tsx:42`
**Issue:** Both `PricingTable` and `ModelDetailClient` independently manage currency toggle state. `PricingTable` supports both controlled mode (`currency` + `onCurrencyChange` props) and uncontrolled mode (`internalCurrency` state), while `ModelDetailClient` uses its own `useState`. This works correctly in the current setup (HomePageClient manages shared state between PricingTable and CostCalculator), but the dual-mode pattern in PricingTable adds complexity. Consider documenting the controlled vs. uncontrolled pattern or simplifying to controlled-only.

---

_Reviewed: 2026-06-14T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
