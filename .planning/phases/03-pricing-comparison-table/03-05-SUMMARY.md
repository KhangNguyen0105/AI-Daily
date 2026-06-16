---
phase: 03-pricing-comparison-table
plan: 05
subsystem: ui
tags: [react, tailwind, responsive, accessibility, nextjs, vitest]

# Dependency graph
requires:
  - phase: 03-pricing-comparison-table
    provides: "PricingTable and CostCalculator components"
provides:
  - Responsive, Tailwind-only compact landing page integration (60/40 layout)
  - Sticky CostCalculator panel next to PricingTable
  - Mobile column hiding classes (D-11)
  - Color-only confidence pills with tooltips and ARIA support (D-15)
  - Cleaned up font weights (400 and 600 only, no font-bold/font-medium)
affects: [frontend, landing-page, responsive-layout, typography, accessibility]

# Tech tracking
tech-stack:
  added: []
  patterns: [side-by-side-sticky-layout, progressive-column-hiding, color-only-confidence-badge]

key-files:
  created: []
  modified:
    - app/page.tsx
    - app/components/HomePageClient.tsx
    - app/components/PricingTable.tsx
    - app/components/CostCalculator.tsx
    - app/compare/page.tsx
    - app/components/TrendChart.tsx

key-decisions:
  - "Changed font weight scheme to strictly 400 (normal) and 600 (semibold) across Phase 3 component surfaces."
  - "Positioned PricingTable as left 60% panel and CostCalculator as right 40% sticky panel at xl and above."
  - "Mapped D-11 responsive column hiding: Family hidden below lg, Source hidden below md, Last Updated/Collected hidden below xl, Context Window hidden below md."
  - "Rendered confidence badges as color-only pills (solid green/yellow/red dots) with non-visible aria-label and tooltips."

patterns-established:
  - "Sticky adjacent panels using xl:sticky and xl:top-4."
  - "Strict font weight restriction for clean dense styling."
  - "Color-only status dots with full screen reader accessibility."

requirements-completed: [PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, PRIC-07, FRNT-03, FRNT-04]

# Metrics
duration: 15min
completed: 2026-06-16
---

# Phase 3 Plan 05: Landing Layout Integration Summary

**Tailwind-only responsive landing page layout, sticky CostCalculator, D-11 column visibility logic, typography normalization (400/600 font weights), and color-only confidence badges.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-16T11:55:33Z
- **Completed:** 2026-06-16
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Implemented a 60/40 side-by-side sticky layout for xl+ viewports using Tailwind classes (`flex flex-col xl:flex-row gap-6`, `xl:w-[60%]`, `xl:w-[40%]`, `xl:sticky xl:top-4`).
- Updated the main title block in `app/page.tsx` to `text-2xl font-semibold` to serve as an ultra-compact, branding-focused header.
- Cleaned up typography on all Phase 3 touched files, replacing `font-medium` and `font-bold` with `font-semibold` or default weight (only 400/600 weights used).
- Formatted confidence badges to render as color-only pills (solid dots `bg-green-500`, `bg-yellow-500`, `bg-red-500`) with no on-screen text labels, using non-visible `aria-label` and `title` tooltips for accessibility (D-15).
- Corrected responsive column visibility in `PricingTable.tsx` to match D-11 exactly:
  - `family` -> `hidden lg:table-cell`
  - `source` -> `hidden md:table-cell`
  - `contextWindow` -> `hidden md:table-cell`
  - `collectedAt` -> `hidden xl:table-cell`
- Set PricingTable scroll height to `calc(100vh - 220px)`.
- Resolved dynamic indexing TypeScript errors in `app/compare/page.tsx` and Recharts Tooltip types in `TrendChart.tsx`.
- Ran full test suite containing 316 tests; all tests passed.
- Successfully built and optimized production static pages with zero compilation/TypeScript errors.

## Task Commits

1. **Task 1 & 2 Execution:** Applied final landing layout, Tailwind-only cleanup, typography updates, responsive columns, and color-only confidence badge logic.
2. **Build Fixes:** Fixed index-by-null and recharts tooltip typing in `app/compare/page.tsx` and `app/components/TrendChart.tsx`.

## Files Created/Modified
- `app/page.tsx` - Title and branding layout updated.
- `app/components/HomePageClient.tsx` - Side-by-side and sticky container layout updated.
- `app/components/PricingTable.tsx` - Responsive column classes, font weights, and confidence badges updated.
- `app/components/CostCalculator.tsx` - Font weights updated.
- `app/compare/page.tsx` - Added guard clause for null modelName in practical costs.
- `app/components/TrendChart.tsx` - Updated Tooltip formatter signature to any type.

## Decisions Made
- Overrode the conflicting visible-label wording in `03-UI-SPEC.md` to prioritize locked decision D-15 (color-only pills with non-visible labels).
- Standardized colors of color-only badges as solid backgrounds (`bg-green-500`, `bg-yellow-500`, `bg-red-500`) to remain visible as compact dots.
- Confirmed type checking build safety by introducing inline guard clauses rather than runtime database casts.

## Deviations from Plan
- None - plan executed exactly as written.

## Issues Encountered
- TypeScript compilation issue during `pnpm build` in `app/compare/page.tsx` (nullable model name indexing) and `app/components/TrendChart.tsx` (Tooltip formatter signature). Both were resolved.
- NEXTAUTH_SECRET check triggered build failure, resolved by adding secret to local `.env`.
