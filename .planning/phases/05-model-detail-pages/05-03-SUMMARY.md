---
phase: 05-model-detail-pages
plan: 03
subsystem: frontend
tags: [recharts, react, pricing-chart, model-detail, typescript]

# Dependency graph
requires:
  - phase: 05-model-detail-pages
    plan: 01
    provides: slug utilities, provider links, promotions schema, pricing-utils functions
provides:
  - PriceHistoryChart component with Recharts dual-line chart
  - PricingGrid component with 3-card currency-aware pricing display
  - PromotionsList component with active/expired styling
  - ProviderLinks component with docs/API/playground links
  - ModelDetailClient wrapper assembling all detail page sections
affects: [05-model-detail-pages/04]

# Tech tracking
tech-stack:
  added:
    - recharts@3.8.1
  patterns:
    - "Recharts in Next.js: 'use client' directive + ResponsiveContainer with explicit height"
    - "Client component receives data from server component via props (server-fetches, client-renders)"
    - "Currency toggle: useState<'usd' | 'vnd'> passed to PricingGrid"

key-files:
  created:
    - app/components/PriceHistoryChart.tsx
    - app/components/PricingGrid.tsx
    - app/components/PromotionsList.tsx
    - app/components/ProviderLinks.tsx
    - app/components/ModelDetailClient.tsx
    - tests/components/price-history-chart.test.tsx
    - tests/components/pricing-grid.test.tsx
    - tests/components/promotions-list.test.tsx
    - tests/components/provider-links.test.tsx
  modified: []

key-decisions:
  - "Recharts ResponsiveContainer in jsdom tests: check container class instead of SVG presence (jsdom has 0 width)"
  - "PromotionsList credits displayed inline with prefix 'Credits:' for semantic clarity"
  - "ModelDetailClient exports ModelDetailData interface for Plan 02 server component to import"

patterns-established:
  - "Component test pattern: '// @vitest-environment jsdom' directive for React component tests"
  - "Recharts empty state: show message when <2 data points (single point cannot form a line)"

requirements-completed: [MDTL-01, MDTL-02, MDTL-03, MDTL-04, MDTL-05]

# Metrics
duration: 7min
completed: 2026-06-14
---

# Phase 5 Plan 03: Client Components Summary

**Recharts price history chart, pricing grid, promotions list, provider links, and model detail client wrapper**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-14T11:31:56Z
- **Completed:** 2026-06-14T11:38:53Z
- **Tasks:** 2
- **Files created:** 9

## Accomplishments

- Installed recharts@3.8.1 as new dependency for price history charting
- Created PriceHistoryChart component with Recharts dual-line chart (input + output prices), empty state for <2 data points
- Created PricingGrid component with 3-card layout (Input $/1M, Output $/1M, Context Window) using formatCurrencyPrice
- Created PromotionsList component with active/expired visual distinction (green vs gray), type badges, source links
- Created ProviderLinks component with docs, API, playground, and pricing page links opening in new tabs
- Created ModelDetailClient wrapper assembling all 7 sections per D-11 layout with currency toggle

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Add failing tests** - `acaee7e` (test)
2. **Task 1 (TDD GREEN): Create 4 component files** - `d80e884` (feat)
3. **Task 2: Create ModelDetailClient wrapper** - `02d41bc` (feat)

## Files Created/Modified

- `app/components/PriceHistoryChart.tsx` - Recharts dual-line chart with date-fns formatting
- `app/components/PricingGrid.tsx` - 3-card pricing display with currency toggle
- `app/components/PromotionsList.tsx` - Active/expired promotions with type badges
- `app/components/ProviderLinks.tsx` - Provider docs/API/playground/pricing links
- `app/components/ModelDetailClient.tsx` - Main wrapper with hero, pricing, chart, specs, promotions, links, digest
- `tests/components/price-history-chart.test.tsx` - 4 tests for chart rendering and empty states
- `tests/components/pricing-grid.test.tsx` - 6 tests for pricing cards and currency formatting
- `tests/components/promotions-list.test.tsx` - 5 tests for active/expired styling and links
- `tests/components/provider-links.test.tsx` - 5 tests for link rendering and attributes

## Decisions Made

- Recharts ResponsiveContainer in jsdom tests: check `.recharts-responsive-container` class instead of SVG element (jsdom reports 0 width, so Recharts renders empty div)
- PromotionsList credits shown inline with "Credits:" prefix for semantic clarity
- ModelDetailClient exports `ModelDetailData`, `HistoryPoint`, `PromotionData` interfaces for Plan 02 server component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts test assertions for jsdom environment**
- **Found during:** Task 1 GREEN phase
- **Issue:** Tests expected SVG element to be present when chart renders, but jsdom has 0 width causing Recharts ResponsiveContainer to render empty div
- **Fix:** Changed assertions to check for `.recharts-responsive-container` class and use `queryByText` for empty state absence
- **Files modified:** tests/components/price-history-chart.test.tsx
- **Verification:** All 4 chart tests pass
- **Committed in:** d80e884

**2. [Rule 1 - Bug] Fixed PromotionsList test text matcher**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test expected standalone "10K tokens/day" text but it was rendered inside "Credits: 10K tokens/day" element
- **Fix:** Changed matcher to regex `/Credits:.*10K tokens\/day/` to match the composite text
- **Files modified:** tests/components/promotions-list.test.tsx
- **Verification:** All 5 promotions tests pass
- **Committed in:** d80e884

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor test assertion adjustments. No scope creep.

## Issues Encountered

None beyond the test fixes documented above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Digest Mentions placeholder | app/components/ModelDetailClient.tsx | Phase 6 (Daily Content Engine) not yet built. Shows "Daily digest mentions will appear here once the content engine is active." |

## Threat Flags

None - no new security surface beyond what the threat model covers. External links use `rel="noopener noreferrer"`. Model names sanitized via existing `sanitizeDisplayName()`.

## Next Phase Readiness

- All 5 client components ready for Plan 02 server page to import and render
- ModelDetailClient accepts `model`, `history`, `promotions`, `exchangeRate` props
- recharts@3.8.1 installed and verified working
- 266 tests pass across 21 test files

## Self-Check: PASSED

All 9 files verified on disk. All 3 commits verified in git log.

---

*Phase: 05-model-detail-pages*
*Completed: 2026-06-14*
