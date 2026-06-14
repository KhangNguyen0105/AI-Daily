# Phase 5 Discussion Log

**Date:** 2026-06-14
**Phase:** 5 - Model Detail Pages

## Area 1: URL Routing & Navigation

### Q1: URL pattern
- **Options:** /model/[slug] (Recommended) / /model/[id] / /model/[provider]/[slug]
- **Selected:** /model/[slug] (Recommended)
- **Notes:** Human-readable, SEO-friendly. Handle same-name models by appending provider suffix when conflicts exist.

### Q2: Navigation entry point
- **Options:** Click model name in table (Recommended) / Dedicated model search/browse / Both table links + search
- **Selected:** Click model name in table (Recommended)
- **Notes:** Model names in PricingTable become clickable links.

### Q3: Page layout
- **Options:** Same layout as landing page (Recommended) / Standalone page with back link
- **Selected:** Same layout as landing page (Recommended)
- **Notes:** Reuse SideNav + TopBar for consistency.

### Q4: Rendering strategy
- **Options:** Static with ISR (Recommended) / Fully dynamic (SSR)
- **Selected:** Static with ISR (Recommended)
- **Notes:** Use generateStaticParams for known models with ISR revalidation.

## Area 2: Price History Data Model

### Q1: History source
- **Options:** Derive from existing extractions (Recommended) / New dedicated price_history table / Daily snapshot aggregation table
- **Selected:** Derive from existing extractions (Recommended)
- **Notes:** Query extractions table grouped by date using collectedAt timestamps. No new table needed.

### Q2: Chart time range
- **Options:** All available history (Recommended) / 30 days default with range selector / Last 7 data points
- **Selected:** All available history (Recommended)
- **Notes:** Plot whatever data the pipeline has collected.

### Q3: Chart library
- **Options:** Recharts (Recommended) / Chart.js / Custom SVG (no library)
- **Selected:** Recharts (Recommended)
- **Notes:** React-native API, line/bar/area charts, well-documented. Already in the recommended stack.

### Q4: Data query approach
- **Options:** Filter by model name + source (Recommended) / Filter by model name only (all sources)
- **Selected:** Filter by model name + source (Recommended)
- **Notes:** Query WHERE modelName = X AND sourceId = Y, ordered by collectedAt.

## Area 3: Promotions & Free Tier Schema

### Q1: Data source
- **Options:** New promotions table (Recommended) / Extend extractions table / JSONB in raw_evidence
- **Selected:** New promotions table (Recommended)
- **Notes:** Explicit, queryable. Fields: sourceId, modelPattern, type, description, credits, startDate, endDate, sourceUrl.

### Q2: Schema detail
- **Options:** Full schema (Recommended) / Minimal schema / Custom fields
- **Selected:** Full schema (Recommended)
- **Notes:** Covers all MDTL-04 needs: free tier, promotions, beta trials, credits, date ranges.

### Q3: Collection method
- **Options:** Automated via pipeline (Recommended) / Manual admin entry / Both automated + manual
- **Selected:** Automated via pipeline (Recommended)
- **Notes:** Add promotions field to provider adapters' crawl/extract output. Pipeline populates promotions table during daily runs.

## Area 4: Page Layout & Structure

### Q1: Page sections
- **Options:** Full detail page (Recommended) / Minimal detail page / Custom layout
- **Selected:** Full detail page (Recommended)
- **Notes:** Hero → Pricing grid → Price history chart → Specifications → Promotions → Provider links → Digest mentions.

### Q2: Hero style
- **Options:** Consistent with landing page (Recommended) / Breadcrumb + compact header
- **Selected:** Consistent with landing page (Recommended)
- **Notes:** Large model name, provider badge, confidence indicator, "Back to pricing" link.

### Q3: Pricing grid
- **Options:** 3-card grid (Recommended) / Single card with table / Custom layout
- **Selected:** 3-card grid (Recommended)
- **Notes:** Input ($/1M), Output ($/1M), Context Window. With currency toggle. Mono-data styling.

### Q4: Chart style
- **Options:** Dual-line chart (Recommended) / Two stacked charts / Area chart with gradient
- **Selected:** Dual-line chart (Recommended)
- **Notes:** Input price and output price as two lines. X-axis: dates, Y-axis: price. Hover tooltip.

## Deferred Ideas

None — discussion stayed within phase scope.
