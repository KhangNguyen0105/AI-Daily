---
phase: 05-model-detail-pages
reviewed: 2026-06-14T00:00:00Z
depth: deep
files_reviewed: 18
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
  - app/lib/url-utils.ts
  - app/model/[slug]/page.tsx
  - app/page.tsx
  - src/db/schema.ts
  - src/pipeline/exchange-rate-worker.ts
  - app/lib/pricing-utils.ts
  - tests/slug.test.ts
  - tests/components/price-history-chart.test.tsx
  - tests/components/pricing-grid.test.tsx
  - tests/components/promotions-list.test.tsx
  - tests/components/provider-links.test.tsx
  - tests/pipeline/exchange-rate-worker.test.ts
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
fixed: 13
remaining: 0
status: resolved
fix_iterations: 3
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-14T00:00:00Z
**Depth:** deep
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 5 introduces model detail pages with database schema additions, slug utilities, a dynamic `/model/[slug]` route with ISR, and five client components (ModelDetailClient, PriceHistoryChart, PricingGrid, PromotionsList, ProviderLinks). The implementation follows the server/client component split well, with pure slug utilities separated from DB-dependent logic for client safety. The import graph is clean with no circular dependencies, and function signatures are consistent across file boundaries.

However, 13 issues were identified: 2 Critical (carried over from the standard review and still unaddressed), 7 Warning (3 carried over, 4 new), and 4 Info (3 carried over, 1 new). The most significant unaddressed issue is the XSS risk from rendering `sourceUrl` as `href` without protocol validation in two components, while a third component (PricingTable) already has the fix. The PostgreSQL `real` type for pricing columns also remains, causing silent floating-point rounding in financial data.

## Critical Issues

### CR-01: PostgreSQL `real` type causes floating-point rounding for pricing and exchange rate columns

**File:** `src/db/schema.ts:54-55, 92, 129`
**Issue:** The `extractions` table uses `real` (4-byte float, ~6-7 significant digits) for `inputPricePer1m`, `outputPricePer1m`, and `estimated_cost`. The `exchangeRates` table also uses `real` for `rate`. PostgreSQL `real` cannot represent many decimal fractions exactly. For example, a price of `$0.0025` stored as `real` becomes approximately `0.002500000178...`. While `formatPrice` and `formatVND` round for display, intermediate calculations (VND conversion, cost calculator) propagate the rounding error. For financial data, `double precision` (8-byte) or `numeric` (arbitrary precision) should be used.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:**
```typescript
// In src/db/schema.ts — change all pricing/rate columns:
inputPricePer1m: doublePrecision('input_price_per_1m'),
outputPricePer1m: doublePrecision('output_price_per_1m'),
estimatedCost: doublePrecision('estimated_cost'),
rate: doublePrecision('rate').notNull(),
```
Requires a migration. Alternatively, use `numeric('column', { precision: 12, scale: 6 })` for exact decimal arithmetic.

---

### CR-02: sourceUrl rendered as href without protocol validation in PromotionsList and ProviderLinks — XSS risk

**File:** `app/components/PromotionsList.tsx:89`, `app/components/ProviderLinks.tsx:51`
**Issue:** Both components render `sourceUrl` directly as an `<a href>` without validating the protocol. A `javascript:alert(document.cookie)` URL stored in the database would execute when clicked. React does NOT sanitize `href` attributes — `javascript:` protocol URLs are rendered verbatim.

Notably, `PricingTable.tsx:313-321` already has the correct fix (validating `new URL(url)` with protocol check). The same fix was not applied to PromotionsList or ProviderLinks, creating an inconsistent security posture.

This finding was identified in the previous standard review (for PromotionsList only). The scope is expanded here to also include ProviderLinks.

**Fix:**
```typescript
// Create a shared utility in app/lib/url-utils.ts:
export function isSafeUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// In PromotionsList.tsx, replace lines 87-95:
{promo.sourceUrl && isSafeUrl(promo.sourceUrl) && (
  <a href={promo.sourceUrl} target="_blank" rel="noopener noreferrer" ...>
    View details
  </a>
)}

// In ProviderLinks.tsx, replace lines 49-58:
{sourceUrl && isSafeUrl(sourceUrl) && (
  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" ...>
    Pricing Page
  </a>
)}
```

---

## Warnings

### WR-01: Model detail page main queries have no try/catch — unhandled errors crash the page

**File:** `app/model/[slug]/page.tsx:64-106`
**Issue:** The `latest` extraction query (lines 64-86) and `history` query (lines 93-106) have no error handling. If the database becomes unavailable between the `resolveSlug` call (which has try/catch) and these queries, the page throws an unhandled error. Inconsistent with the `promotions` query (lines 119-137) and `exchangeRate` query (lines 140-145), which both have try/catch blocks.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:**
```typescript
// Wrap the main queries in try/catch:
let latest: ... | null = null;
let history: ...[] = [];

try {
  const [latestRow] = await db.select(...)...;
  latest = latestRow;
  history = await db.select(...)...;
} catch (err) {
  console.error('Failed to fetch model data:', err);
  notFound();
}

if (!latest) {
  notFound();
}
```

---

### WR-02: resolveSlug silently swallows all errors, including non-DB failures

**File:** `app/lib/slug.ts:38-40`
**Issue:** The catch block catches all exceptions indiscriminately:
```typescript
} catch {
  // DB unavailable — return null
}
```
This hides schema errors, query syntax errors, connection pool exhaustion, and any other failure. The comment says "DB unavailable" but the catch is untyped and unconditional.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:**
```typescript
} catch (err) {
  // Log for diagnostics — swallow to avoid exposing DB errors to client
  if (err instanceof Error) {
    console.error('[resolveSlug] Failed:', err.message);
  }
  return null;
}
```

---

### WR-03: Price history empty state message is misleading when exactly 1 data point exists

**File:** `app/components/PriceHistoryChart.tsx:32-37`
**Issue:** When `chartData.length < 2`, the component shows "Price history will appear after multiple data collections." With 1 data point, this is misleading — the user has data but cannot see it. The message implies the data does not exist yet, when in fact it exists but is insufficient for a chart.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:**
```typescript
if (chartData.length === 0) {
  return (
    <div className="text-center py-8 text-gray-500">
      No pricing data available yet. Check back after the next collection.
    </div>
  );
}

if (chartData.length === 1) {
  return (
    <div className="text-center py-8 text-gray-500">
      Only 1 data point collected. Price history chart will appear after the next collection.
    </div>
  );
}
```

---

### WR-04: NaN exchangeRate silently degrades VND display to "N/A" without user explanation

**File:** `app/lib/pricing-utils.ts:83-86`
**Issue:** If `exchangeRate` is `NaN`, `convertToVND` computes `price * NaN` which produces `NaN`. The `formatVND` function has a `Number.isNaN` guard (line 94) that returns "N/A" instead of displaying "NaN". However, the user sees "N/A" for all VND prices with no indication that the exchange rate is the problem. The root cause (NaN rate) is not validated at the entry point.

This finding was identified in the previous standard review. It is partially mitigated by the NaN guard in `formatVND`, but the root cause remains unaddressed.

**Fix:**
```typescript
export function formatCurrencyPrice(
  price: number | null | undefined,
  currency: 'usd' | 'vnd',
  rate?: number
): string {
  if (currency === 'vnd') {
    const effectiveRate = rate ?? USD_VND_RATE;
    if (!Number.isFinite(effectiveRate)) return formatPrice(price); // fallback to USD
    return formatVND(convertToVND(price, effectiveRate));
  }
  return formatPrice(price);
}
```

---

### WR-05: storeRate deduplication has dead code and incorrect date logic

**File:** `src/pipeline/exchange-rate-worker.ts:84-97`
**Issue:** The function computes `today` (lines 84-85) with the comment "Check if we already have this rate for today", but `today` is never used in the query. The deduplication query (lines 87-97) checks for ANY matching rate value regardless of date. This means:
1. If the rate was stored last week and happens to match today's rate, the function skips insertion (incorrect deduplication).
2. If the rate changes during the day, a second insertion is allowed (correct behavior by accident).

The `today` variable is dead code, and the deduplication logic does not match the documented intent.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:**
```typescript
async function storeRate(rate: number): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db
      .select({ id: exchangeRates.id })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, 'USD'),
          eq(exchangeRates.toCurrency, 'VND'),
          gte(exchangeRates.fetchedAt, today), // check TODAY only
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return; // Already fetched today
    }

    await db.insert(exchangeRates).values({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate,
    });
  } catch (err) {
    console.warn('Failed to store exchange rate in DB:', err);
  }
}
```

---

### WR-06: PricingGrid labels show "$/1M" even when displaying VND values

**File:** `app/components/PricingGrid.tsx:16-20`
**Issue:** The card labels are hardcoded as `'Input $/1M'`, `'Output $/1M'`, and `'Context Window'`. When the user switches to VND currency, the values display correctly in VND format (e.g., "89.250 ₫"), but the labels still show "$/1M". This creates a visual inconsistency — the label says dollars but the value shows dong.

**Fix:**
```typescript
interface PricingGridProps {
  inputPrice: number | null;
  outputPrice: number | null;
  contextWindow: number | null;
  currency: 'usd' | 'vnd';
  exchangeRate: number;
}

export function PricingGrid({
  inputPrice, outputPrice, contextWindow, currency, exchangeRate,
}: PricingGridProps) {
  const symbol = currency === 'vnd' ? '₫' : '$';
  const cards = [
    { label: `Input ${symbol}/1M`, key: 'input' as const },
    { label: `Output ${symbol}/1M`, key: 'output' as const },
    { label: 'Context Window', key: 'context' as const },
  ];
  // ... rest unchanged
}
```

---

### WR-07: History query has no LIMIT clause — unbounded result set

**File:** `app/model/[slug]/page.tsx:93-106`
**Issue:** The price history query fetches ALL extractions for a given model and source with no `limit()`:
```typescript
const history = await db
  .select(...)
  .from(extractions)
  .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
  .orderBy(extractions.collectedAt);
```
If the pipeline runs daily for a year, this returns 365 rows. For 3 years, 1,095 rows. While Recharts can handle this, the data transfer and chart rendering degrade with unbounded growth. There is also no practical reason to chart more than ~90 days of history.

**Fix:**
```typescript
import { desc } from 'drizzle-orm';

const history = await db
  .select(...)
  .from(extractions)
  .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
  .orderBy(desc(extractions.collectedAt))
  .limit(90);  // Last 90 data points
```

---

## Info

### IN-01: Redundant `new Date()` wrapping of values that are already Date objects

**File:** `app/model/[slug]/page.tsx:131-134, 148-156`, `app/components/PriceHistoryChart.tsx:27`
**Issue:** Drizzle returns JavaScript `Date` objects for `timestamp` columns. The code wraps them in `new Date()` again. This is harmless but adds unnecessary object creation.

This finding was identified in the previous standard review and remains unaddressed.

---

### IN-02: Provider Resources section renders empty heading when no provider links exist

**File:** `app/components/ModelDetailClient.tsx:164-169`
**Issue:** The "Provider Resources" section always renders its heading. When `ProviderLinks` returns `null` (unknown provider and no sourceUrl), the user sees a "Provider Resources" heading with nothing below it.

This finding was identified in the previous standard review and remains unaddressed.

**Fix:** Conditionally render the entire section:
```typescript
{(model.sourceName || model.sourceUrl) && (
  <section className="border-b py-8">
    <h2 className="text-xl font-semibold mb-4">Provider Resources</h2>
    <ProviderLinks providerName={model.sourceName ?? ''} sourceUrl={model.sourceUrl} />
  </section>
)}
```

---

### IN-03: Currency toggle logic duplicated across three components

**Files:** `app/components/ModelDetailClient.tsx:42,93-114`, `app/components/HomePageClient.tsx:24`, `app/components/PricingTable.tsx:161-163`
**Issue:** Three separate components independently manage currency toggle state with identical button markup. This violates DRY and makes future changes (e.g., adding EUR) require updates in three places.

This finding was identified in the previous standard review and remains unaddressed.

---

### IN-04: generateSlug dot-stripping can produce collisions for edge-case model names

**File:** `app/lib/slug-utils.ts:20`
**Issue:** The `.replace(/\./g, '')` step strips all dots before hyphenation. This means two distinct model names like `"model.v1"` and `"modelv1"` (same sourceId) produce the same slug. In practice this is extremely unlikely since model names in the extraction pipeline are consistent. But the ambiguity exists in the algorithm.

**Fix:** If collision avoidance matters, preserve dots as hyphens instead of removing them:
```typescript
.replace(/\./g, '-')  // dots become hyphens: "model.v1" -> "model-v1"
```

---

## Fix Report (3 iterations)

### Iteration 1 — 10 findings fixed

| ID | Severity | Status | Files Modified |
|----|----------|--------|----------------|
| CR-01 | Critical | ✅ Fixed | `src/db/schema.ts` — `real` → `doublePrecision` for 4 columns |
| CR-02 | Critical | ✅ Fixed | `app/components/PromotionsList.tsx`, `app/components/ProviderLinks.tsx` — added `isSafeUrl` guard |
| WR-01 | Warning | ✅ Fixed | `app/model/[slug]/page.tsx` — try/catch for main DB queries |
| WR-02 | Warning | ✅ Fixed | `app/lib/slug.ts` — error logging in catch block |
| WR-03 | Warning | ✅ Fixed | `app/components/PriceHistoryChart.tsx` — split empty state messages |
| WR-04 | Warning | ✅ Fixed | `app/lib/pricing-utils.ts` — NaN guard in formatCurrencyPrice |
| WR-05 | Warning | ✅ Fixed | `src/pipeline/exchange-rate-worker.ts` — date-based dedup logic |
| WR-06 | Warning | ✅ Fixed | `app/components/PricingGrid.tsx` — dynamic currency labels |
| WR-07 | Warning | ✅ Fixed | `app/model/[slug]/page.tsx` — LIMIT 90 on history query |
| IN-01 | Info | ✅ Fixed | `app/model/[slug]/page.tsx`, `app/components/PriceHistoryChart.tsx` — removed redundant Date wrapping |
| IN-02 | Info | ✅ Fixed | `app/components/ModelDetailClient.tsx` — conditional Provider Resources section |
| IN-03 | Info | ⏭️ Skipped | Refactoring too invasive for auto-fix |
| IN-04 | Info | ⏭️ Skipped | Intentional design decision |

### Iteration 2 — 3 new issues fixed

| ID | Severity | Status | Files Modified |
|----|----------|--------|----------------|
| NI-01 | Warning | ✅ Fixed | `tests/pipeline/exchange-rate-worker.test.ts` — added proper db.select mock chain |
| NI-02 | Info | ✅ Fixed | Created `app/lib/url-utils.ts`, updated PromotionsList + ProviderLinks imports |
| IN-01p | Info | ✅ Fixed | `app/components/ModelDetailClient.tsx` — removed remaining redundant Date wrapping |

### Iteration 3 — Final verification

All fixes verified. No new issues. **266 tests pass across 21 test files.**

---

_Reviewed: 2026-06-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Fix iterations: 3_
_Status: resolved_
