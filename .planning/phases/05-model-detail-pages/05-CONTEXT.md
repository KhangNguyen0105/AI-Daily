# Phase 5: Model Detail Pages - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers per-model profile pages that let users drill into a specific model's full pricing details, historical price trends, active promotions/free tier status, and provider links. The page is accessible by clicking a model name in the PricingTable and shares the same SideNav layout as the landing page.

**In scope:** Model detail page with current pricing, price history chart, specifications (context window, model family, release date), promotions/free tier display, provider links (docs, API, playground), and recent digest mentions.

**Out of scope:** Price alert notifications (Phase 7), multi-model comparison (Phase 7), admin promotion entry (Phase 8), model search/browse page.

</domain>

<decisions>
## Implementation Decisions

### URL Routing & Navigation
- **D-01:** URL pattern is `/model/[slug]` — human-readable, SEO-friendly. Use `generateStaticParams` for known models with ISR revalidation.
- **D-02:** Navigation entry point is clicking model names in the PricingTable — model names become `<Link>` elements pointing to `/model/[slug]`.
- **D-03:** Same SideNav + TopBar layout as the landing page. Consistent look, easy to navigate back.
- **D-04:** Handle same-name models from different providers by appending provider suffix when conflicts exist (e.g., `gpt-4o` vs `gpt-4o-azure`).

### Price History Data Model
- **D-05:** Derive price history from existing `extractions` table using `collectedAt` timestamps — no new table needed. Query `extractions WHERE modelName = X AND sourceId = Y ORDER BY collectedAt`.
- **D-06:** Show all available history data points — no time range selector. Plot whatever data the pipeline has collected.
- **D-07:** Use Recharts for the price history line chart (recommended in CLAUDE.md). Dual-line chart with input price and output price as two lines.
- **D-08:** Filter history by model name + source (provider) — not aggregated across providers.

### Promotions & Free Tier Schema
- **D-09:** New `promotions` table with full schema: `sourceId`, `modelPattern` (regex/glob), `type` (free_tier/promotion/beta), `description`, `credits`, `startDate`, `endDate`, `sourceUrl`.
- **D-10:** Promotion data is collected automatically via the pipeline — add a `promotions` field to provider adapters' crawl/extract output. Pipeline populates the promotions table during daily runs.

### Page Layout & Structure
- **D-11:** Full detail page with sections: Hero → Pricing grid → Price history chart → Specifications → Promotions → Provider links → Digest mentions.
- **D-12:** Hero section: large model name, provider badge, confidence indicator, "Back to pricing" link. Consistent with landing page visual style.
- **D-13:** Pricing grid: 3 cards (Input $/1M, Output $/1M, Context Window) with currency toggle. Uses mono-data styling from the pricing table.
- **D-14:** Price history chart: dual-line chart (input + output prices over time). X-axis: dates, Y-axis: price. Hover tooltip shows exact values.

### Claude's Discretion
- Slug generation strategy for model names (normalize, lowercase, hyphenate)
- Chart styling (colors, grid lines, axis labels) — follow Recharts defaults with theme colors
- Empty states for missing data (no history, no promotions, no digest mentions)
- Loading states and error handling for the detail page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/db/schema.ts` — Drizzle schema with `extractions`, `sources`, `articles` tables. New `promotions` table to be added.
- `drizzle.config.ts` — Drizzle Kit configuration for migrations.

### Existing Components
- `app/components/PricingTable.tsx` — TanStack Table with model names that will become links.
- `app/components/HomePageClient.tsx` — Client wrapper with currency state pattern to reuse.
- `app/page.tsx` — Server component with Drizzle query pattern and ISR to follow.

### Utilities
- `app/lib/pricing-utils.ts` — `formatPrice`, `formatCurrencyPrice`, `sanitizeDisplayName`, currency conversion functions.
- `app/lib/cost-scenarios.ts` — Cost scenario definitions (not directly relevant but shows pattern).

### Design System
- `app/globals.css` — Tailwind v4 `@theme` with all design tokens (colors, typography, spacing, border-radius).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PricingTable` component: model names are rendered as `<span>` — can be changed to `<Link>` with minimal effort.
- `HomePageClient` currency state pattern: `useState<'usd' | 'vnd'>` passed down as props. Detail page should follow same pattern.
- `formatPrice`, `formatCurrencyPrice`, `formatContextWindow`: ready to use for pricing display.
- `sanitizeDisplayName`: already handles Unicode manipulation — reuse for model names on detail page.
- `formatVND`, `convertToVND`: currency conversion utilities ready.

### Established Patterns
- Server component fetches data, passes to client component (page.tsx → HomePageClient)
- ISR with `revalidate = 60` for periodic refresh
- Drizzle `leftJoin` for joining extractions with sources
- Try/catch with fallback for DB unavailability during build
- Tailwind v4 `@theme` tokens for all styling (no Tailwind config file)

### Integration Points
- `app/model/[slug]/page.tsx` — new dynamic route
- `src/db/schema.ts` — add `promotions` table
- `app/components/PricingTable.tsx` — add `<Link>` to model names
- `src/providers/base.ts` — add promotions extraction to adapter interface
- `recharts` — new dependency to install

</code_context>

<specifics>
## Specific Ideas

- Model detail page should feel like a natural deep-dive from the pricing table — same visual language, same typography, same color scheme.
- The price history chart is the centerpiece — it should be prominent and easy to read.
- Promotions section should clearly indicate active vs expired status with visual cues (green for active, gray for expired).
- "Back to pricing" link in the hero should be prominent — users need an easy way back to the main table.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Model Detail Pages*
*Context gathered: 2026-06-14*
