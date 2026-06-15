# Phase 7: Intelligence & Analytics - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers pricing intelligence features: trend charts, promotion tracking, multi-model comparison, and price alerts. Users can explore how prices change over time, track active promotions, compare models side-by-side, and get notified when prices drop.

**In scope:** Pricing trend charts (per-model), promotion/free tier tracker, multi-model comparison (2-5 models), price threshold alerts (localStorage, on-page notification).

**Out of scope:** Email subscriptions (v2), user accounts (v1 constraint), real-time streaming updates, admin alert management (Phase 8), community features.

</domain>

<decisions>
## Implementation Decisions

### Trend Charts (INTL-01, INTL-02)

- **D-01:** New `/trends` route — dedicated page for pricing trends. Not integrated into landing page.
- **D-02:** Per-model charts — one chart per model showing input/output price over time. Click model name to see its trend.
- **D-03:** All available data — no time range selector. Show whatever data the pipeline has collected. Matches Phase 5 decision (D-06).
- **D-04:** Visual markers on chart — mark price drops with green dots, price increases with red dots. New model launches get a star icon.
- **D-05:** Use Recharts for trend charts — consistent with Phase 5 (D-07). Dual-line chart with input and output prices.

### Promotion Tracker (INTL-03)

- **D-06:** New `/promotions` route — dedicated page for promotion tracking.
- **D-07:** Card grid layout — cards with promo name, provider, type badge, expiration date, description. Filter by type (free_tier, promotion, beta).
- **D-08:** Show all promos, gray out expired ones, sort active first. Simple, no hiding.
- **D-09:** Data from existing `promotions` table — already has `modelPattern`, `type`, `description`, `credits`, `startDate`, `endDate`.

### Multi-Model Comparison (INTL-04)

- **D-10:** New `/compare` route — dedicated page for model comparison. URL: `/compare?models=gpt-4o,claude-sonnet-4-5`
- **D-11:** Dropdown selectors — 2-5 dropdowns with search. Each dropdown shows all available models.
- **D-12:** All dimensions — pricing (input/output), context window, practical costs (4 scenarios), free tier status, confidence score.
- **D-13:** Side-by-side cards — one card per model showing all dimensions. Scroll horizontally if >3 models.

### Price Alerts (INTL-05)

- **D-14:** localStorage storage — no backend needed. Alerts are per-device. No user accounts constraint.
- **D-15:** Bell icon on model detail page — click to set threshold. Plus `/alerts` page to manage all alerts.
- **D-16:** On-page check — check alerts on page load, show toast/banner if any triggered. No browser push permissions needed.
- **D-17:** Below threshold only — alert when price drops below threshold. Most common use case: "notify me when it gets cheaper."
- **D-18:** Alert structure in localStorage: `{ modelName, sourceId, thresholdPrice, createdAt }`.

### Navigation & Layout

- **D-19:** Add "Trends", "Promotions", "Compare", "Alerts" links to TopNav. Consistent with existing "Pricing" and "Daily Digest" links.
- **D-20:** All new pages use same SideNav + TopBar layout as existing pages.

### Claude's Discretion

- Chart styling (colors, grid lines, axis labels) — follow Recharts defaults with theme colors
- Card styling for promotions — follow existing card patterns
- Dropdown component for model selection — build custom or use existing library
- Toast/banner component for alerts — build custom or use existing library
- Empty states for all new pages
- Loading states for all new pages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/db/schema.ts` — Existing tables: `extractions`, `promotions`, `practical_costs`, `sources`. No new tables needed.
- `drizzle.config.ts` — Drizzle Kit configuration for migrations.

### Existing Components (patterns to follow)
- `app/components/PricingTable.tsx` — TanStack Table with sorting/filtering. Pattern for data tables.
- `app/components/PriceHistoryChart.tsx` — Recharts line chart for price history. Direct reuse for trend charts.
- `app/components/ModelDetailClient.tsx` — Model detail page layout. Where bell icon for alerts will be added.
- `app/components/PromotionsList.tsx` — Existing promotions display. May be reusable or reference for /promotions page.
- `app/components/CostCalculator.tsx` — Practical cost scenarios. Data source for comparison dimensions.

### Existing Pages (patterns to follow)
- `app/page.tsx` — Server component with Drizzle query and ISR pattern.
- `app/model/[slug]/page.tsx` — Dynamic route with generateStaticParams + ISR. Pattern for /trends/[model].
- `app/digest/page.tsx` — Archive list with pagination. Pattern for /promotions page.
- `app/digest/[date]/page.tsx` — Article detail with SSG. Pattern for detail pages.

### Design System
- `app/globals.css` — Tailwind v4 @theme tokens.
- `app/components/TopNav.tsx` — Site navigation. Will need new links.
- `app/layout.tsx` — Root layout with SideNav + TopBar.

### Pipeline
- `src/pipeline/workers/generate.ts` — Generate worker. May need to check for triggered alerts.
- `src/pipeline/orchestrator.ts` — Pipeline orchestration.

</canonical_refs>
