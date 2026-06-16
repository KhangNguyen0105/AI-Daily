# Phase 3: Pricing Comparison Table - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a sortable, filterable, searchable pricing comparison table on the public landing page with confidence badges, source attribution, and USD/VND currency toggle. The table shows AI model pricing data collected by the pipeline, with interactive controls for exploring the data.

**In scope:** Pricing table with sorting/filtering/search, confidence badges, source attribution links, USD/VND currency toggle, responsive layout, side-by-side arrangement with CostCalculator, data deduplication, exchange rate management, component test coverage.

**Out of scope:** New capabilities beyond the existing PRIC-01 through PRIC-07 requirements, admin features (Phase 8), email subscriptions (v2), user accounts (v1 constraint).

</domain>

<decisions>
## Implementation Decisions

### Landing Page Layout
- **D-01:** Side-by-side 60/40 layout — PricingTable (60%) left, CostCalculator (40%) right. Stacked on smaller screens.
- **D-02:** xl breakpoint (1280px) — side-by-side at xl and above, stacked below.
- **D-03:** Sticky CostCalculator — `xl:sticky xl:top-4` keeps cost scenarios visible while PricingTable scrolls.
- **D-04:** Ultra-compact branding — minimize header/branding vertical space to maximize table real estate. Reduce heading sizes and padding.
- **D-05:** Mobile (< 768px) — stacked layout with progressive column hiding. Family, Source, Last Updated columns hidden at smaller breakpoints.
- **D-06:** Viewport-relative table height — `calc(100vh - 220px)` for the scrollable table area. Fills remaining viewport space.
- **D-07:** Bordered card container — `border border-gray-200 rounded-lg overflow-hidden` around PricingTable.
- **D-08:** Max-width 1600px — `max-w-[1600px]` for the landing page content area (wider than original 1152px).
- **D-09:** White card container for CostCalculator — `border border-gray-200 rounded-lg p-4 bg-white`.
- **D-10:** gap-6 (24px) between PricingTable and CostCalculator panels.
- **D-11:** Current responsive column hiding — Family hidden below lg, Source hidden below md, Last Updated hidden below xl.
- **D-12:** Paginated 50 rows per page with prev/next buttons and page numbers.
- **D-13:** Inline filters — provider dropdown, free-tier checkbox, price range inputs, context window inputs all visible above the table.
- **D-14:** Search scope — global search matches against model name, provider name, AND model family names.
- **D-15:** Confidence display — color pill badges (green=verified, yellow=likely, red=low-confidence). No icons or text labels.
- **D-16:** Click-to-sort — click column header to cycle asc → desc → none. Visual arrow indicators.
- **D-17:** Empty state — friendly message: "No pricing data yet. The pipeline runs daily."
- **D-18:** Error state — warning banner with "Unable to load pricing data" message and retry button. Silent fallback to empty array.
- **D-19:** Loading state — skeleton rows that mimic table structure.
- **D-20:** Scroll indicator — subtle visual hint when table has more rows below the visible area.

### Data Freshness & Deduplication
- **D-21:** Show latest extraction only — deduplicate to one row per model+provider. No historical data in the table.
- **D-22:** Database-level deduplication — use DISTINCT ON or subquery in the Drizzle query. Smaller data transfer, faster page load.
- **D-23:** Freshness display — show both last collection time AND next scheduled run time.
- **D-24:** Staleness warning — show warning banner if data is older than 24 hours.
- **D-25:** Multiple sources — when different providers report different prices for the same model, show both rows with provider name.
- **D-26:** Null pricing — show 'N/A' with tooltip explaining why (e.g., 'Pricing not available from this provider').
- **D-27:** Source links — show provider name as clickable text with URL on hover tooltip. Not raw URLs.

### Exchange Rate & Stitch Cleanup
- **D-28:** Live API fetch — fetch USD/VND exchange rate from exchangerate-api.com at build time or on ISR revalidation.
- **D-29:** Stitch full revert — delete Stitch integration docs AND revert all Stitch-specific styling changes. Return to pre-Stitch appearance.
- **D-30:** Standard Tailwind — after reverting Stitch, use standard Tailwind theme with no custom tokens.

### Component Test Coverage
- **D-31:** Test scope — PricingTable and HomePageClient components.
- **D-32:** Test framework — Vitest + @testing-library/react with jsdom (consistent with existing tests).
- **D-33:** Test priority — sorting (click headers, verify order), filtering (provider dropdown, free-tier checkbox), and search (type query, verify results).
- **D-34:** Mock data — fixture file with 10-15 realistic PricingRow objects. Reusable across tests.

### Claude's Discretion
- Skeleton row styling (follow Tailwind animation patterns)
- Scroll indicator design (fade gradient or subtle arrow)
- Staleness warning banner styling
- Retry button behavior (full page reload vs. client-side refetch)
- Test file naming and directory structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/db/schema.ts` — Drizzle schema with `extractions`, `sources`, `promotions`, `practical_costs` tables.
- `drizzle.config.ts` — Drizzle Kit configuration for migrations.

### Existing Components (patterns to follow)
- `app/components/PricingTable.tsx` — TanStack Table with sorting/filtering/search. Primary component to modify.
- `app/components/HomePageClient.tsx` — Client wrapper with currency state. Layout restructure target.
- `app/components/CostCalculator.tsx` — Practical cost scenarios. Side-by-side partner with PricingTable.
- `app/components/PricingGrid.tsx` — Card-style pricing display (separate from table). Reference for card patterns.

### Utilities
- `app/lib/pricing-utils.ts` — formatPrice, formatCurrencyPrice, sanitizeDisplayName, getConfidenceColor, getModelFamily. 13 exports, 75 tests.
- `app/lib/provider-metadata.ts` — getProviderLogo, getUniqueProviders.
- `app/lib/slug-utils.ts` — generateSlug for model detail page links.

### Existing Pages (patterns to follow)
- `app/page.tsx` — Server component with Drizzle query, ISR (revalidate=60), exchange rate fetch.
- `app/model/[slug]/page.tsx` — Dynamic route with generateStaticParams + ISR.

### Design System
- `app/globals.css` — Tailwind v4 @theme tokens.
- `app/layout.tsx` — Root layout with SideNav + TopBar.

### Pipeline
- `src/pipeline/exchange-rate-worker.ts` — getLatestExchangeRate(), FALLBACK_RATE constant.
- `src/pipeline/scheduler.ts` — Daily job scheduling (for next run time display).

### Requirements
- `.planning/REQUIREMENTS.md` § PRIC-01 through PRIC-07 — Pricing display requirements.
- `.planning/REQUIREMENTS.md` § FRNT-03, FRNT-04 — Responsive and last-updated requirements.

### Tests
- `tests/pricing-utils.test.ts` — 75 tests for pricing utilities. Pattern for test structure.
- `tests/components/pricing-grid.test.tsx` — 6 tests for PricingGrid. Pattern for component tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PricingRow` interface (PricingTable.tsx:43) — canonical data shape used by 5+ files. Must be preserved.
- `pricing-utils.ts` — 13 pure functions, no side effects. formatCurrencyPrice() is the single entry point for price rendering.
- `provider-metadata.ts` — logo lookup and provider extraction. Ready for source link display.
- `slug-utils.ts` — slug generation for model detail page links.
- `useDeferredValue` pattern — already used for search input. No external debounce dependency needed.
- Module-level TanStack Table row models — instantiated once at module scope, not per render.

### Established Patterns
- Server/Client split: server component fetches data, passes plain objects as props to client components.
- Lifted currency state: HomePageClient owns currency state, passes as controlled props to PricingTable and CostCalculator.
- Pre-filter pipeline: range/boolean filters applied via useMemo before TanStack Table processes data.
- Defensive error handling: each async operation has its own try/catch with sensible fallbacks.
- ISR with 60-second revalidation: static generation with periodic refresh.
- Unicode sanitization (WR-01): all user-visible names pass through sanitizeDisplayName().

### Integration Points
- `app/page.tsx` → `HomePageClient` → `PricingTable` + `CostCalculator` (data flow)
- `src/db/schema.ts` → Drizzle query in page.tsx (data source)
- `src/pipeline/exchange-rate-worker.ts` → getLatestExchangeRate() (exchange rate)
- `app/globals.css` → Tailwind theme tokens (styling)
- `app/layout.tsx` → SideNav + TopBar (navigation)

### Stitch Integration Status
- 3 Stitch planning docs are being deleted (PLAN, RESEARCH, SUMMARY)
- HomePageClient.tsx has layout changes (side-by-side) that should be reverted per D-29
- PricingTable.tsx has minor CSS change (max-height) that should be reverted per D-29
- page.tsx has padding/heading changes that should be reverted per D-29

</code_context>

<specifics>
## Specific Ideas

- Ultra-compact landing page — user wants maximum table real estate, minimal branding chrome
- Search should include model family names (e.g., typing 'Claude' finds all Claude models)
- Source links should show provider name, not raw URL — cleaner, more readable
- Staleness warning at 24 hours — pipeline failure detection
- Both last-run and next-run times visible — user knows when to check back
- Full Stitch revert — return to standard Tailwind, no custom tokens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-Pricing Comparison Table*
*Context gathered: 2026-06-16*
