# Phase 3: Pricing Comparison Table - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 3-pricing-comparison-table
**Areas discussed:** Landing page layout, Data freshness & dedup, Exchange rate & Stitch cleanup, Component test coverage

---

## Landing Page Layout

### Q1: PricingTable + CostCalculator arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side 60/40 | PricingTable left (60%), CostCalculator right (40%) with xl:sticky. Stacked on smaller screens. | ✓ |
| Stacked (original) | Full-width PricingTable, CostCalculator below. Each section gets maximum horizontal space. | |
| Side-by-side with expand | Side-by-side on desktop, but with different proportions or a toggle to expand one panel full-width. | |

**User's choice:** Side-by-side 60/40 (Recommended)
**Notes:** User confirmed the uncommitted layout restructuring approach.

### Q2: Breakpoint for side-by-side

| Option | Description | Selected |
|--------|-------------|----------|
| xl: 1280px | Current change uses `xl`. Below that, both stack vertically. | ✓ |
| lg: 1024px | More devices get the split layout, but the 60/40 split gets tight. | |
| 2xl: 1536px | Only split at ultra-wide. Most users see stacked. | |

**User's choice:** xl: 1280px (Recommended)
**Notes:** Confirmed — tablets and smaller laptops see stacked layout.

### Q3: Scroll behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky CostCalculator | CostCalculator sticks to top-4 while PricingTable scrolls. | ✓ |
| Both scroll freely | Neither sticks. Simpler CSS, but user loses sight of costs when scrolling. | |
| Sticky table header only | PricingTable header sticks (already done), CostCalculator scrolls freely. | |

**User's choice:** Sticky CostCalculator (Recommended)
**Notes:** User always sees cost scenarios while browsing pricing data.

### Q4: Vertical spacing for branding

| Option | Description | Selected |
|--------|-------------|----------|
| Compact (current changes) | Reduced h1 from text-3xl to text-2xl, py-8 to py-5. | |
| Spacious (original) | Keep original larger headings and spacing. | |
| Ultra-compact | Remove branding section entirely or collapse into TopNav. Maximize table real estate. | ✓ |

**User's choice:** Ultra-compact
**Notes:** User wants maximum table real estate, minimal branding chrome.

### Q5: Mobile behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked with column hiding | PricingTable full width, CostCalculator stacks below. Table columns hide progressively. | ✓ |
| Stacked with collapsible calculator | CostCalculator collapses into expandable section on mobile. | |
| Card view on mobile | Simplified card view instead of full table on mobile. | |

**User's choice:** Stacked with column hiding (Recommended)
**Notes:** Progressive column hiding for dense data on mobile.

### Q6: Table scrollable area sizing

| Option | Description | Selected |
|--------|-------------|----------|
| Viewport-relative | calc(100vh - 220px). Table fills remaining viewport space with internal scroll. | ✓ |
| Fixed max-height | 600px or 70vh. Predictable regardless of viewport. | |
| No max-height | Table grows with data, page scrolls naturally. | |

**User's choice:** Viewport-relative (current change)
**Notes:** Good for side-by-side layout.

### Q7: Container styling

| Option | Description | Selected |
|--------|-------------|----------|
| Bordered card | border border-gray-200 rounded-lg overflow-hidden. Card-like appearance. | ✓ |
| Borderless | Table sits directly on page background. | |
| Shadow card | Subtle shadow instead of border. | |

**User's choice:** Bordered card (current change)
**Notes:** Gives the table a card-like appearance.

### Q8: Max-width

| Option | Description | Selected |
|--------|-------------|----------|
| 1600px | Wider than original max-w-6xl (1152px). More room for side-by-side. | ✓ |
| 1152px (original) | More constrained, centered on wide screens. | |
| Full width | No max-width — full bleed. | |

**User's choice:** 1600px (current change)
**Notes:** Appropriate for side-by-side layout.

### Q9: CostCalculator container

| Option | Description | Selected |
|--------|-------------|----------|
| White card | border border-gray-200 rounded-lg p-4 bg-white. | ✓ |
| Tinted background | Subtle background color (gray-50) to separate from PricingTable. | |
| No container | CostCalculator sits directly in sticky div. | |

**User's choice:** White card (current)
**Notes:** Consistent with bordered card for PricingTable.

### Q10: Gap between panels

| Option | Description | Selected |
|--------|-------------|----------|
| gap-6 (24px) | Moderate spacing between panels. | ✓ |
| gap-4 (16px) | Tighter, more connected feel. | |
| gap-8 (32px) | More breathing room. | |

**User's choice:** gap-6 (current)
**Notes:** Confirmed.

### Q11: Responsive column hiding

| Option | Description | Selected |
|--------|-------------|----------|
| Current responsive hiding | Family below lg, Source below md, Last Updated below xl. | ✓ |
| Always show all | Horizontal scroll on small screens. | |
| Minimal mobile columns | Hide Family, Source, Last Updated, AND Confidence on mobile. | |

**User's choice:** Current responsive hiding (Recommended)
**Notes:** Progressive disclosure for dense data.

### Q12: Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Paginated 50/page | 50 rows per page with prev/next buttons and page numbers. | ✓ |
| Show all | No pagination. Simple but can be slow. | |
| Infinite scroll | Load more rows as user scrolls. | |

**User's choice:** Paginated 50/page (current)
**Notes:** Good balance of data density and performance.

### Q13: Filter UI

| Option | Description | Selected |
|--------|-------------|----------|
| Inline filters | Filter controls inline above the table. All visible at once. | ✓ |
| Collapsible advanced filters | Only search and provider visible by default. | |
| Filter sidebar | Filters in slide-out sidebar panel. | |

**User's choice:** Inline filters (current)
**Notes:** All filter controls visible for quick access.

### Q14: Search scope

| Option | Description | Selected |
|--------|-------------|----------|
| Model + Provider | Current: global text search matches model name and provider name. | |
| Model + Provider + Family | Also search within model family names. User can type 'Claude' to find all Claude models. | ✓ |
| All columns | Search across all visible columns including source URLs. | |

**User's choice:** Model + Provider + Family
**Notes:** More intuitive search — typing 'Claude' finds all Claude models.

### Q15: Confidence display

| Option | Description | Selected |
|--------|-------------|----------|
| Color pills | Green (verified), yellow (likely), red (low-confidence) pill badges. | ✓ |
| Color pills + icons | Add icons alongside colors for accessibility. | |
| Text labels | 'Verified', 'Likely', 'Low' text labels. | |

**User's choice:** Color pills (current)
**Notes:** Simple, scannable.

### Q16: Column sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-sort | Click column header to cycle asc → desc → none. Visual arrow indicators. | ✓ |
| Click + sort dropdown | Also add a sort dropdown for common sorts. | |
| Default sort by price | Default sort by input price ascending. | |

**User's choice:** Click-to-sort (current)
**Notes:** Standard table interaction pattern.

### Q17: Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Friendly message | "No pricing data yet. The pipeline runs daily." | ✓ |
| Empty table shell | Show table structure with empty rows. | |
| Skeleton/loading state | Redirect to 'coming soon' or show loading skeleton. | |

**User's choice:** Friendly message (Recommended)
**Notes:** Clear communication when no data exists.

### Q18: Error state

| Option | Description | Selected |
|--------|-------------|----------|
| Silent fallback | Falls back to empty array. Silent failure. | |
| Warning banner + retry | Show warning banner with retry button. | ✓ |
| Full error page | Show full error page with details. | |

**User's choice:** Warning banner + retry
**Notes:** More transparent than silent failure.

### Q19: Loading state

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton rows | Skeleton rows that mimic table structure. | ✓ |
| Spinner | Simple spinner with 'Loading pricing data...' text. | |
| No loading state (ISR) | ISR means page is pre-rendered. | |

**User's choice:** Skeleton rows (Recommended)
**Notes:** User sees the layout before data arrives.

### Q20: Scroll hint

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll indicator | Subtle scroll indicator when table has more rows. | ✓ |
| No hint | User discovers scrolling naturally. | |
| Row count indicator | 'Showing 50 of 247 models'. | |

**User's choice:** Scroll indicator
**Notes:** Subtle visual hint for more rows below.

---

## Data Freshness & Deduplication

### Q21: Deduplication strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Latest only | Show only the latest extraction per model+provider. | ✓ |
| Show all extractions | Show all extractions. User sees historical data. | |
| Latest + history toggle | Show latest by default, with toggle to reveal older extractions. | |

**User's choice:** Latest only (Recommended)
**Notes:** Clean table, one row per model+provider.

### Q22: Dedup layer

| Option | Description | Selected |
|--------|-------------|----------|
| Database query | DISTINCT ON or subquery in Drizzle query. Smaller data transfer. | ✓ |
| Client-side useMemo | Fetch all, deduplicate in useMemo. Simpler query. | |
| Database view | Materialized view in PostgreSQL. Most efficient. | |

**User's choice:** Database query (Recommended)
**Notes:** DB handles the logic, smaller data transfer.

### Q23: Freshness display

| Option | Description | Selected |
|--------|-------------|----------|
| Max collectedAt | Current: shows max(collectedAt) from DB query. | |
| Last + next run time | Show both last collection time AND next scheduled run. | ✓ |
| Relative time | '2 hours ago' instead of absolute date. | |

**User's choice:** Last + next run time
**Notes:** User knows when to check back.

### Q24: Staleness warning

| Option | Description | Selected |
|--------|-------------|----------|
| Staleness warning | Warning banner if data is older than 24 hours. | ✓ |
| No warning | User judges freshness from timestamp. | |
| Color-coded freshness | Green (< 24h), yellow (24-48h), red (> 48h). | |

**User's choice:** Staleness warning (Recommended)
**Notes:** Pipeline failure detection.

### Q25: Multiple sources for same model

| Option | Description | Selected |
|--------|-------------|----------|
| Show both | If two providers report different prices, show both rows. | ✓ |
| Highest confidence only | Show only the highest-confidence source. | |
| Average price | Show the average of both sources. | |

**User's choice:** Show both (Recommended)
**Notes:** User can compare sources and see price discrepancies.

### Q26: Null pricing display

| Option | Description | Selected |
|--------|-------------|----------|
| N/A text | Show 'N/A' in gray text. Current behavior. | |
| Hide incomplete rows | Hide rows where input AND output pricing are both null. | |
| N/A with tooltip | Show 'N/A' with tooltip explaining why. | ✓ |

**User's choice:** N/A with tooltip
**Notes:** More informative than plain N/A.

### Q27: Source attribution links

| Option | Description | Selected |
|--------|-------------|----------|
| Direct link | Source URL validated and rendered as clickable link. | |
| Provider name as link | Show provider name as link text instead of raw URL. | |
| Name + URL tooltip | Provider name as clickable text with URL on hover tooltip. | ✓ |

**User's choice:** Name + URL tooltip
**Notes:** Cleaner, more readable than raw URLs.

---

## Exchange Rate & Stitch Cleanup

### Q28: Exchange rate management

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded fallback | FALLBACK_RATE = 25500. getLatestExchangeRate() is primary. | |
| Live API fetch | Fetch from exchangerate-api.com at build time or ISR revalidation. | ✓ |
| DB-only, no fallback | Store in DB, update daily. No hardcoded fallback. | |

**User's choice:** Live API fetch
**Notes:** Always current exchange rate.

### Q29: Exchange rate API source

| Option | Description | Selected |
|--------|-------------|----------|
| exchangerate-api.com | Free tier: 1500 requests/month. Reliable. | ✓ |
| open.er-api.com | Free tier: 100 requests/month. | |
| Existing worker + better fallback | Keep exchange-rate-worker, improve fallback. | |

**User's choice:** exchangerate-api.com
**Notes:** Higher free tier, reliable.

### Q30: Stitch integration files

| Option | Description | Selected |
|--------|-------------|----------|
| Delete Stitch docs | Delete the 3 Stitch planning files. Design decisions already integrated. | |
| Archive Stitch docs | Keep as reference but mark archived. | |
| Full revert | Delete docs AND revert all Stitch-specific styling changes. | ✓ |

**User's choice:** Full revert
**Notes:** Return to pre-Stitch appearance.

### Q31: Post-Stitch styling

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Tailwind | Return to original Tailwind theme. No custom tokens. | ✓ |
| Keep tokens, revert layout | Keep some Stitch tokens but remove layout changes. | |
| Minimal custom theme | Borrow a few Stitch ideas but mostly standard. | |

**User's choice:** Standard Tailwind
**Notes:** Clean, standard Tailwind after reverting Stitch.

---

## Component Test Coverage

### Q32: Test scope

| Option | Description | Selected |
|--------|-------------|----------|
| PricingTable + HomePageClient | Test both components. ~15-20 test cases. | ✓ |
| PricingTable only | Only test PricingTable — it's the complex component. | |
| Full stack tests | Also test page.tsx with mocked DB. | |
| Skip component tests | pricing-utils.ts already has 75 tests. | |

**User's choice:** PricingTable + HomePageClient (Recommended)
**Notes:** Both components need coverage.

### Q33: Test framework

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest + Testing Library | Already used for pricing-grid.test.tsx. Consistent. | ✓ |
| Playwright component tests | Real browser rendering. More accurate but slower. | |
| Vitest + snapshots | Quick to write but brittle. | |

**User's choice:** Vitest + Testing Library (Recommended)
**Notes:** Consistent with project testing patterns.

### Q34: Test priority

| Option | Description | Selected |
|--------|-------------|----------|
| Sorting + filtering + search | Test core interactive features. | ✓ |
| All interactions | Also test currency toggle, pagination. | |
| Edge cases | Empty data, null pricing, single model, 100+ models. | |

**User's choice:** Sorting + filtering + search (Recommended)
**Notes:** Core interactive features first.

### Q35: Mock data approach

| Option | Description | Selected |
|--------|-------------|----------|
| Fixture file | 10-15 realistic PricingRow objects. Reusable. | ✓ |
| Inline mocks | Generate mock data inline in each test. | |
| Test database | Use actual DB query with test database. | |

**User's choice:** Fixture file (Recommended)
**Notes:** Reusable across tests, easy to maintain.

---

## Claude's Discretion

- Skeleton row styling (follow Tailwind animation patterns)
- Scroll indicator design (fade gradient or subtle arrow)
- Staleness warning banner styling
- Retry button behavior (full page reload vs. client-side refetch)
- Test file naming and directory structure

## Deferred Ideas

None — discussion stayed within phase scope
