---
phase: 03-pricing-comparison-table
plan: 04
subsystem: ui
tags: [react, currency, vnd, usd, tailwind, tanstack-table, vitest, exchange-rate, drizzle]

# Dependency graph
requires:
  - phase: 03-pricing-comparison-table
    provides: "PricingTable component with sorting, filtering, provider logos, source links, and mobile responsiveness (03-01/03-02/03-03)"
provides:
  - USD/VND currency toggle in pricing table filter bar
  - Currency conversion utilities (convertToVND, formatVND, formatCurrencyPrice)
  - Currency-aware column headers and cell renderers
  - Dynamic exchange rate fetched daily from open.er-api.com
  - Exchange rate stored in PostgreSQL with fallback chain
affects: [frontend, pricing-table, currency-display, pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [currency-toggle-button-group, formatCurrencyPrice-delegation-pattern, exchange-rate-fallback-chain]

key-files:
  created:
    - src/pipeline/exchange-rate-worker.ts
    - tests/pipeline/exchange-rate-worker.test.ts
  modified:
    - app/lib/pricing-utils.ts
    - app/components/PricingTable.tsx
    - app/page.tsx
    - src/db/schema.ts
    - tests/pricing-utils.test.ts

key-decisions:
  - "Dynamic exchange rate fetched daily from open.er-api.com (free, no API key)"
  - "Fallback chain: API → last DB rate → hardcoded 25500"
  - "formatCurrencyPrice accepts optional rate parameter for backward compatibility"
  - "Exchange rate fetched as first step in daily pipeline before provider collection"

patterns-established:
  - "Currency toggle via button group with active/inactive styling (bg-blue-600 text-white vs bg-white border)"
  - "formatCurrencyPrice delegation pattern -- single function handles both USD and VND rendering"
  - "Exchange rate fallback chain: API → DB → hardcoded constant"

requirements-completed: [PRIC-07]

# Metrics
duration: 5min
completed: 2026-06-13
---

# Phase 3 Plan 04: USD/VND Currency Toggle Summary

**USD/VND currency toggle with dynamic exchange rate, Vietnamese number formatting, and currency-aware column headers and cell renderers**

## Performance

- **Duration:** ~10 min (Tasks 1-2: 5 min, Task 3: 5 min)
- **Started:** 2026-06-13T02:35:19Z
- **Completed:** 2026-06-13
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added USD_VND_RATE constant (25500) as fallback exchange rate
- Implemented convertToVND function with null/undefined passthrough and optional rate parameter
- Implemented formatVND function with Vietnamese number formatting (dot thousands separator, dong symbol)
- Implemented formatCurrencyPrice as single entry point delegating to formatPrice (USD) or convertToVND+formatVND (VND)
- Added currency toggle button group in filter bar between search input and provider dropdown
- Updated Input/Output column headers to reflect selected currency symbol ($ or ₫)
- Updated price cell renderers to use formatCurrencyPrice with currency state
- Created exchange_rates table in PostgreSQL for storing daily rates
- Created exchange-rate-worker.ts that fetches USD/VND rate from open.er-api.com
- Implemented fallback chain: API → last DB rate → hardcoded 25500
- Updated page.tsx to query latest rate and pass as prop to PricingTable
- Added 15 new unit tests (201 total tests passing across 15 test files)
- Build compiles with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for currency conversion** - `c7eca05` (test)
2. **Task 1 (GREEN): Implement currency conversion functions** - `fb687cf` (feat)
3. **Task 2: Add currency toggle to PricingTable** - `68eb3c9` (feat)
4. **Task 3: Dynamic exchange rate** - (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added exchange_rates table (id, fromCurrency, toCurrency, rate, fetchedAt)
- `src/pipeline/exchange-rate-worker.ts` - Created: fetches rate from open.er-api.com, stores in DB, exports getLatestExchangeRate()
- `app/lib/pricing-utils.ts` - Updated convertToVND and formatCurrencyPrice to accept optional rate parameter
- `app/components/PricingTable.tsx` - Added exchangeRate prop, passes to formatCurrencyPrice
- `app/page.tsx` - Queries latest exchange rate via getLatestExchangeRate(), passes to PricingTable
- `tests/pricing-utils.test.ts` - Added 9 tests for rate parameter in convertToVND and formatCurrencyPrice
- `tests/pipeline/exchange-rate-worker.test.ts` - Created: 6 tests for exchange rate worker fallback chain

## Decisions Made
- Dynamic exchange rate fetched daily from open.er-api.com (free, no API key required)
- Fallback chain: API → last DB rate → hardcoded 25500 — ensures rate is always available
- formatCurrencyPrice accepts optional rate parameter — backward compatible, no breaking changes
- Exchange rate fetched as first step in daily pipeline — ensures fresh rate before cost comparisons
- Rate stored in exchange_rates table — provides audit trail and fallback source

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - open.er-api.com is free and requires no API key.

## Next Phase Readiness
- Phase 3 pricing table feature set is now complete with dynamic currency conversion
- Ready for Phase 4 (data visualization / charts) or Phase 5 (admin dashboard)

---
*Phase: 03-pricing-comparison-table*
*Completed: 2026-06-13*
