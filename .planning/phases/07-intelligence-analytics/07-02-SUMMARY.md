# Phase 7 Plan 02 Summary

**Plan:** 07-02 — Trend Charts + /trends Page
**Status:** Complete
**Date:** 2026-06-15

## What Was Done

### Task 1: TrendChart Component with Visual Markers
- Created `app/components/TrendChart.tsx` extending the PriceHistoryChart Recharts pattern
- Dual-line chart: input price (#3b82f6 blue) and output price (#ef4444 red)
- Custom dot components defined as named functions outside render (avoids Pitfall 1 re-render performance issue):
  - `InputDot` / `OutputDot`: green circle (#16a34a, r=6) for price drops, red circle (#dc2626, r=6) for increases
  - `StarMarker`: amber star (#f59e0b) for first data point (new model launch)
- Data sorted chronologically (oldest first) before chart rendering (avoids Pitfall 5)
- Empty state: "No pricing data available yet."
- Single point state: "Only 1 data point collected. Trend chart will appear after the next collection."
- Exports `TrendPoint` interface and `TrendChart` component

### Task 2: /trends Page with Model List and Chart Display
- Created `app/trends/page.tsx` — server component with `revalidate = 60` ISR pattern
- Drizzle query: extractions JOIN sources, ordered by collectedAt ascending, grouped by modelName+sourceId in JS
- Created `app/components/TrendsPageClient.tsx` — client wrapper with:
  - Model list grid (1-col mobile, 2-col md, 3-col lg) when no model selected
  - Each card shows sanitized model name, source name, data point count
  - Click card to view trend chart; back button to return to list
  - Empty state: "No trend data yet" / "Pricing trends will appear after the pipeline collects data over multiple days."
- Page layout: `max-w-6xl mx-auto px-4 py-8` per UI-SPEC
- Model names sanitized via `sanitizeDisplayName` from pricing-utils

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `app/components/TrendChart.tsx` | Created | Recharts dual-line chart with visual markers |
| `tests/components/trend-chart.test.tsx` | Created | 10 unit tests for TrendChart component |
| `app/components/TrendsPageClient.tsx` | Created | Client wrapper with model list and chart display |
| `app/trends/page.tsx` | Created | Server component fetching trend data via Drizzle |

## Tests Run

- `pnpm test tests/components/trend-chart.test.tsx` — 10/10 passed
- TypeScript check: no errors in new files (2 pre-existing errors in `tests/pricing-utils.test.ts`, unrelated)

## Verification

- [x] TrendChart.tsx exports `TrendChart` component and `TrendPoint` interface
- [x] Chart renders dual lines: input (#3b82f6) and output (#ef4444)
- [x] Empty state displays "No pricing data available yet."
- [x] Single point state displays "Only 1 data point collected."
- [x] Data sorted ascending by collectedAt before chart rendering
- [x] Custom dot components defined as standalone named functions (not inline arrows)
- [x] `tests/components/trend-chart.test.tsx` passes (10/10)
- [x] `app/trends/page.tsx` exports default async function with `revalidate = 60`
- [x] Server component queries extractions JOIN sources and groups by modelName+sourceId
- [x] TrendsPageClient renders model grid when no model selected
- [x] TrendsPageClient renders TrendChart when model is selected
- [x] Back button returns to model list view
- [x] Empty state shows "No trend data yet" message
- [x] Page uses `max-w-6xl mx-auto px-4 py-8` container per UI-SPEC

## Requirements Covered

- **INTL-01**: Pricing trend charts per model over time — delivered via TrendChart with dual-line Recharts LineChart
- **INTL-02**: Highlight price drops and new model launches — delivered via custom dot components (green/red/amber markers)
