# Phase 3: Pricing Comparison Table - Research

**Researched:** 2026-06-11
**Domain:** Frontend data table with sorting, filtering, search, and responsive design
**Confidence:** HIGH

## Summary

Phase 3 builds a sortable, filterable, searchable pricing comparison table on the public landing page. The current codebase has a basic table in `app/page.tsx` that queries the `extractions` table and renders a simple HTML table with confidence badges. This phase upgrades that to a full-featured comparison table using @tanstack/react-table for headless table logic and @tremor/react for UI components (badges, search input, filters).

The key architectural decision is whether to use **client-side** or **server-side** filtering/sorting. Given the data volume (30+ providers, likely hundreds of models), client-side processing is sufficient and simpler. The data is already fetched via ISR (revalidate=60s), so all filtering/sorting happens in the browser. This avoids the need for a dedicated API endpoint and keeps the page statically generated.

**Primary recommendation:** Use @tanstack/react-table v8 with client-side filtering/sorting/pagination, Tremor Badge for confidence indicators, and Tailwind responsive utilities for mobile support.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data fetching (extractions, sources) | Next.js Server Component (ISR) | — | Server-side query at revalidation time; no client API needed |
| Table rendering | Browser / Client | — | Interactive sorting/filtering/search requires client state |
| Filtering logic | Browser / Client | — | @tanstack/react-table handles client-side filtering |
| Search logic | Browser / Client | — | Global filter on model name + provider name |
| Confidence badge display | Browser / Client | — | Tremor Badge component renders in browser |
| Source attribution link | Browser / Client | — | Links to source URL from joined sources table |
| "Last updated" display | Next.js Server Component | — | Derived from max(collectedAt) in DB query |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Headless table with sorting, filtering, pagination | Already in CLAUDE.md stack. Headless = full Tailwind control. Built-in global filter, column filter, faceted filter. |
| @tremor/react | 3.18.7 | Badge, TextInput, Select components | Already in CLAUDE.md stack. Badge for confidence indicators. TextInput for search. Select for filter dropdowns. |
| date-fns | 4.4.0 | Date formatting for "Last updated" | Already installed. `format()` for human-readable dates. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lodash.debounce | 4.x | Debounce search input | Prevents filtering on every keystroke. 300ms debounce. [ASSUMED] — verify if needed or use useDeferredValue |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tanstack/react-table | Tremor Table | Tremor Table is simpler but lacks built-in sorting/filtering/pagination. @tanstack/react-table is purpose-built for interactive tables. |
| Client-side filtering | Server-side API + PostgreSQL full-text search | Server-side adds complexity (API route, query params). Client-side is sufficient for hundreds of models. |
| lodash.debounce | React useDeferredValue | useDeferredValue is built-in (React 18+), no extra dependency. Prefer useDeferredValue. |

**Installation:**
```bash
pnpm add @tanstack/react-table @tremor/react
```

**Version verification:**
- @tanstack/react-table: 8.21.3 [VERIFIED: npm registry]
- @tremor/react: 3.18.7 [VERIFIED: npm registry]
- date-fns: 4.4.0 [VERIFIED: npm registry] (already installed)

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @tanstack/react-table | npm | 5+ years | 4M+/week | github.com/TanStack/table | [OK] | Approved |
| @tremor/react | npm | 3+ years | 200K+/week | github.com/tremorlabs/tremor | [OK] | Approved |
| date-fns | npm | 8+ years | 20M+/week | github.com/date-fns/date-fns | [OK] | Already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User Browser
    |
    v
Next.js Server Component (ISR, revalidate=60s)
    |
    v
PostgreSQL (extractions + sources tables)
    |
    v
Server Component fetches: extractions JOIN sources
    |
    v
Passes data as props to Client Component
    |
    v
PricingTable Client Component
    |
    +-- @tanstack/react-table (useReactTable)
    |   +-- Global filter (search across model name + provider)
    |   +-- Column filters (provider, price range, context window, free tier)
    |   +-- Sorting (all columns)
    |   +-- Pagination (50 rows per page)
    |
    +-- UI Layer
    |   +-- TextInput (search bar, debounced)
    |   +-- Select (provider filter dropdown)
    |   +-- RangeSlider or number inputs (price range filter)
    |   +-- Badge (confidence: green/yellow/red)
    |   +-- Table (Tremor or custom Tailwind table)
    |
    +-- Responsive Strategy
        +-- Desktop: full table with all columns
        +-- Tablet: hide less important columns (source, last updated)
        +-- Mobile: horizontal scroll or card view
```

### Recommended Project Structure

```
app/
├── page.tsx                    # Server Component - fetches data, passes to PricingTable
├── components/
│   └── PricingTable.tsx        # Client Component - interactive table
│   └── PricingTable/
│       ├── SearchInput.tsx     # Debounced search input
│       ├── FilterBar.tsx       # Provider, price range, context window filters
│       ├── ConfidenceBadge.tsx # Green/yellow/red badge
│       ├── SourceLink.tsx      # Source URL with last-updated timestamp
│       └── MobileCard.tsx      # Card view for mobile (optional)
└── lib/
    └── pricing-utils.ts        # formatPrice, formatContextWindow, sanitizeDisplayName
```

### Pattern 1: Server/Client Component Split

**What:** Server Component fetches data, Client Component handles interactivity
**When to use:** When data is fetched via ISR but UI needs client-side state (sorting, filtering)
**Example:**
```tsx
// app/page.tsx (Server Component)
import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { PricingTable } from './components/PricingTable';

export const revalidate = 60;

export default async function HomePage() {
  const data = await db
    .select({
      id: extractions.id,
      modelName: extractions.modelName,
      inputPricePer1m: extractions.inputPricePer1m,
      outputPricePer1m: extractions.outputPricePer1m,
      contextWindow: extractions.contextWindow,
      confidence: extractions.confidence,
      collectedAt: extractions.collectedAt,
      sourceName: sources.name,
      sourceUrl: sources.url,
    })
    .from(extractions)
    .leftJoin(sources, eq(extractions.sourceId, sources.id))
    .orderBy(desc(extractions.collectedAt));

  const lastUpdated = data[0]?.collectedAt ?? null;

  return (
    <main>
      <PricingTable data={data} lastUpdated={lastUpdated} />
    </main>
  );
}
```

### Pattern 2: @tanstack/react-table with Global Filter

**What:** Client-side table with search, column filters, sorting, pagination
**When to use:** When data volume is manageable (< 1000 rows) and all data is loaded at once
**Example:**
```tsx
// app/components/PricingTable.tsx (Client Component)
'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';

const columnHelper = createColumnHelper<PricingRow>();

const columns = [
  columnHelper.accessor('modelName', {
    header: 'Model',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('sourceName', {
    header: 'Provider',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('inputPricePer1m', {
    header: 'Input ($/1M)',
    cell: (info) => formatPrice(info.getValue()),
  }),
  columnHelper.accessor('outputPricePer1m', {
    header: 'Output ($/1M)',
    cell: (info) => formatPrice(info.getValue()),
  }),
  columnHelper.accessor('contextWindow', {
    header: 'Context Window',
    cell: (info) => formatContextWindow(info.getValue()),
  }),
  columnHelper.accessor('confidence', {
    header: 'Confidence',
    cell: (info) => <ConfidenceBadge confidence={info.getValue()} />,
  }),
];

export function PricingTable({ data, lastUpdated }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  // ... render table
}
```

### Pattern 3: Confidence Badge with Tremor

**What:** Color-coded badge indicating data confidence level
**When to use:** For each extraction row to show confidence score
**Example:**
```tsx
import { Badge } from '@tremor/react';

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colorMap = {
    verified: 'emerald',
    likely: 'yellow',
    low_confidence: 'red',
  };
  return (
    <Badge color={colorMap[confidence] ?? 'gray'} size="sm">
      {confidence}
    </Badge>
  );
}
```

### Anti-Patterns to Avoid

- **Server-side filtering for small datasets:** Don't build an API route for filtering when client-side is sufficient. The dataset is hundreds of rows, not millions.
- **Custom table implementation:** Don't build sorting/filtering from scratch. @tanstack/react-table handles all edge cases (multi-sort, stable sort, filter composition).
- **Blocking the main thread with filter:** Don't run expensive filters synchronously. Use `useDeferredValue` or `useMemo` for derived data.
- **Hardcoded provider logos:** Don't hardcode logo URLs in the component. Create a provider metadata map that can be updated independently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting | Custom sort comparator | @tanstack/react-table `getSortedRowModel()` | Handles multi-sort, null values, stable sort |
| Table filtering | Custom filter functions | @tanstack/react-table `getFilteredRowModel()` | Handles filter composition, faceted values |
| Search input debounce | setTimeout/clearTimeout | React `useDeferredValue` or `useMemo` | Built-in, no extra dependency |
| Confidence badge | Custom colored span | Tremor `Badge` component | Consistent styling, accessibility, tooltip support |
| Date formatting | Manual date string construction | date-fns `format()` | Handles timezone, locale, edge cases |

**Key insight:** The table is the core UX of the entire site. Don't compromise on sorting/filtering quality — use the battle-tested library.

## Common Pitfalls

### Pitfall 1: Provider Name Not Available in Extractions Table

**What goes wrong:** The `extractions` table has `sourceId` (FK to `sources`), not `providerName`. The current landing page query doesn't join with `sources`, so provider name is missing.

**Why it happens:** Schema design stores provider info in `sources` table, but the query in `app/page.tsx` only selects from `extractions`.

**How to avoid:** Always JOIN `extractions` with `sources` to get `sources.name` as provider name and `sources.url` as source URL.

**Warning signs:** Table shows model names but no provider column.

### Pitfall 2: No Free Tier Field in Schema

**What goes wrong:** PRIC-04 requires filtering by "free tier availability," but the `extractions` table has no `freeTier` or `isFree` boolean field.

**Why it happens:** Phase 2 focused on pricing extraction; free tier data wasn't modeled.

**How to avoid:** This is a schema gap. Options:
1. **Infer from price:** If `inputPricePer1m === 0 && outputPricePer1m === 0`, treat as free tier. Simple but may miss free tiers with non-zero overage.
2. **Add `freeTier` column:** Add `boolean('free_tier').default(false)` to `extractions` table via migration. More accurate but requires Phase 2 data to populate it.
3. **Add `freeTierDescription` column:** Add `text('free_tier_description')` for richer free tier info (e.g., "1000 requests/day free").

**Recommendation:** Option 1 (infer from price) for v1. Option 2 can be added later when Phase 2 collects free tier data.

**Warning signs:** Filter dropdown for "free tier" shows no results or incorrect results.

### Pitfall 3: No Provider Logo URL in Schema

**What goes wrong:** PRIC-02 requires provider logos, but neither `sources` nor `extractions` has a `logoUrl` field.

**Why it happens:** Provider configs (`src/providers/*/config.ts`) only have `name`, `baseUrl`, `pricingUrl` — no logo URL.

**How to avoid:** Create a static provider metadata map in the frontend:
```ts
const providerLogos: Record<string, string> = {
  openai: '/logos/openai.svg',
  anthropic: '/logos/anthropic.svg',
  google: '/logos/google.svg',
  // ...
};
```
Store logo SVGs in `public/logos/`. This is a frontend-only concern — no schema change needed.

**Warning signs:** Table shows provider name but no logo.

### Pitfall 4: Model Family Grouping Not in Schema

**What goes wrong:** PRIC-02 requires "model family grouping" (e.g., GPT-4 family, Claude 3 family), but the schema only has `modelName` as a string.

**Why it happens:** Model family is not a structured field — it's embedded in the model name (e.g., "gpt-4o", "gpt-4o-mini" are both "GPT-4" family).

**How to avoid:** Derive model family from model name using a utility function:
```ts
function getModelFamily(modelName: string): string {
  const name = modelName.toLowerCase();
  if (name.startsWith('gpt-4')) return 'GPT-4';
  if (name.startsWith('claude-3')) return 'Claude 3';
  if (name.startsWith('gemini')) return 'Gemini';
  // ...
  return 'Other';
}
```

**Warning signs:** No grouping visible in the table.

### Pitfall 5: Tremor CSS Conflict with Tailwind 4.x

**What goes wrong:** Tremor 3.x was built for Tailwind 3.x. Tailwind 4.x has breaking changes (new config format, `@import "tailwindcss"` instead of `@tailwind`).

**Why it happens:** Tremor's internal styles may not be compatible with Tailwind 4.x.

**How to avoid:** Check Tremor 3.18.7 compatibility with Tailwind 4.x. If incompatible, use Tremor's CSS classes manually or fall back to custom Tailwind components.

**Warning signs:** Tremor components render with broken styles.

**Mitigation:** If Tremor has compatibility issues, the Badge component is simple enough to replace with a custom Tailwind implementation (the current `getConfidenceColor` function in `app/page.tsx` already does this).

### Pitfall 6: ISR Data Freshness vs Client-Side State

**What goes wrong:** User sorts/filters the table, then ISR revalidation triggers and the page re-renders, losing the user's sort/filter state.

**Why it happens:** ISR revalidation replaces the server-rendered HTML, which resets client state.

**How to avoid:** Use `'use client'` on the PricingTable component. Client state (sorting, filtering) is preserved across ISR revalidations because React maintains the component instance.

**Warning signs:** User's sort/filter selection disappears after ~60 seconds.

## Code Examples

### Server Component with JOIN Query

```tsx
// Source: Drizzle ORM docs - https://orm.drizzle.team
import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq, desc, max } from 'drizzle-orm';

// Get pricing data with provider info
const pricingData = await db
  .select({
    id: extractions.id,
    modelName: extractions.modelName,
    inputPricePer1m: extractions.inputPricePer1m,
    outputPricePer1m: extractions.outputPricePer1m,
    contextWindow: extractions.contextWindow,
    confidence: extractions.confidence,
    collectedAt: extractions.collectedAt,
    sourceName: sources.name,
    sourceUrl: sources.url,
  })
  .from(extractions)
  .leftJoin(sources, eq(extractions.sourceId, sources.id))
  .orderBy(desc(extractions.collectedAt));

// Get last updated timestamp
const [{ lastUpdated }] = await db
  .select({ lastUpdated: max(extractions.collectedAt) })
  .from(extractions);
```

### @tanstack/react-table Column Definition with Custom Cell

```tsx
// Source: TanStack Table docs - https://tanstack.com/table/v8/docs
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<PricingRow>();

const columns = [
  columnHelper.accessor('modelName', {
    header: 'Model',
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
    enableGlobalFilter: true,
  }),
  columnHelper.accessor('inputPricePer1m', {
    header: 'Input ($/1M tokens)',
    cell: (info) => formatPrice(info.getValue()),
    sortingFn: 'basic',
    filterFn: 'inNumberRange',
  }),
  columnHelper.accessor('confidence', {
    header: 'Confidence',
    cell: (info) => <ConfidenceBadge confidence={info.getValue()} />,
    filterFn: 'equals',
  }),
];
```

### Responsive Table with Tailwind

```tsx
// Desktop: full table, Mobile: horizontal scroll
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead>
      <tr>
        <th className="px-4 py-3 text-left">Model</th>
        <th className="px-4 py-3 text-right">Input</th>
        <th className="px-4 py-3 text-right">Output</th>
        <th className="hidden md:table-cell px-4 py-3 text-right">Context</th>
        <th className="hidden lg:table-cell px-4 py-3 text-center">Confidence</th>
        <th className="hidden xl:table-cell px-4 py-3 text-left">Source</th>
      </tr>
    </thead>
    {/* ... */}
  </table>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML table with no interactivity | @tanstack/react-table with sorting/filtering | Phase 3 | Users can actually find and compare models |
| No search | Global filter across model + provider | Phase 3 | Users can quickly find specific models |
| No source attribution | Source link with last-updated timestamp | Phase 3 | Data transparency and trust |
| Fixed-width table | Responsive with horizontal scroll or card view | Phase 3 | Mobile users can access the data |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Client-side filtering is sufficient for the dataset size (< 1000 rows) | Architecture Patterns | If dataset grows to 10K+ rows, need server-side filtering. Low risk for v1. |
| A2 | Free tier can be inferred from `inputPricePer1m === 0 && outputPricePer1m === 0` | Common Pitfalls | May miss free tiers with non-zero overage pricing. Medium risk. |
| A3 | Provider logos can be served as static SVGs in `public/logos/` | Common Pitfalls | No schema change needed. If logos change frequently, may need a different approach. Low risk. |
| A4 | Model family can be derived from model name prefix | Common Pitfalls | May not cover all model naming conventions. Low risk for known providers. |
| A5 | Tremor 3.18.7 is compatible with Tailwind 4.x | Common Pitfalls | If incompatible, can replace Tremor Badge with custom Tailwind component. Medium risk. |
| A6 | `useDeferredValue` is preferred over lodash.debounce for search debouncing | Alternatives Considered | `useDeferredValue` is built-in React 18+. No extra dependency. Low risk. |

## Open Questions (RESOLVED)

1. **Does the `sources` table have a `lastCrawledAt` field?**
   - What we know: The schema shows `updatedAt` on `sources`, which is updated on every record update.
   - RESOLVED: Use `max(extractions.collectedAt)` as the "last updated" timestamp and compute freshness from extraction collection time, not `sources.updatedAt`. This is locked by D-21 through D-24 and implemented in plans 03-02 and 03-05.

2. **How should model family grouping be displayed?**
   - What we know: PRIC-02 requires "model family grouping."
   - RESOLVED: Add a derived "Family" column from model name and include family in global search. Do not add collapsible row groups for this phase. This is locked by D-05, D-11, and D-14 and covered by plans 03-01 and 03-03.

3. **Should the table support column resizing?**
   - What we know: @tanstack/react-table supports column resizing.
   - RESOLVED: Skip column resizing for v1. Use fixed responsive column visibility and viewport-relative table height from D-05, D-06, and D-11. Covered by plans 03-03 and 03-05.

4. **What Tremor version is compatible with Tailwind 4.x?**
   - What we know: Tremor 3.18.7 is in the stack. Tailwind 4.3.0 is in the stack.
   - RESOLVED: Do not use Tremor or shadcn for Phase 3 UI work. Use Tailwind CSS 4.x utilities and existing local components only. This is locked by D-29, D-30, and 03-UI-SPEC, and covered by plans 03-03 and 03-05.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | ✓ | — | — |
| pnpm | Package manager | ✓ | — | — |
| PostgreSQL | Data source | ✓ | — | — |
| @tanstack/react-table | Table logic | ✓ | 8.21.3 | — |
| @tremor/react | UI components | ✓ | 3.18.7 | Custom Tailwind |
| date-fns | Date formatting | ✓ | 4.4.0 | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIC-01 | Sortable/filterable table renders | unit | `pnpm test -- --grep "pricing table"` | Wave 0 |
| PRIC-02 | Provider logos and model family grouping | unit | `pnpm test -- --grep "provider"` | Wave 0 |
| PRIC-03 | Full-text search across model names | unit | `pnpm test -- --grep "search"` | Wave 0 |
| PRIC-04 | Filter by provider, price range, context window, free tier | unit | `pnpm test -- --grep "filter"` | Wave 0 |
| PRIC-05 | Source link with last-updated timestamp | unit | `pnpm test -- --grep "source"` | Wave 0 |
| PRIC-06 | Confidence badge display | unit | `pnpm test -- --grep "confidence"` | Wave 0 |
| FRNT-03 | Responsive design | manual | — | — |
| FRNT-04 | "Last updated: [date]" display | unit | `pnpm test -- --grep "last updated"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/pricing-table.test.tsx` — covers PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06
- [ ] `tests/pricing-utils.test.ts` — covers formatPrice, formatContextWindow, getModelFamily
- [ ] `tests/responsive.test.tsx` — covers FRNT-03 (manual verification only)

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] @tanstack/react-table 8.21.3
- [VERIFIED: npm registry] @tremor/react 3.18.7
- [VERIFIED: npm registry] date-fns 4.4.0
- [VERIFIED: Context7] TanStack Table docs - sorting, filtering, pagination patterns
- [VERIFIED: Context7] Tremor docs - Badge, Table components
- [VERIFIED: Context7] Drizzle ORM docs - JOIN queries, raw SQL

### Secondary (MEDIUM confidence)
- [CITED: tanstack.com/table/v8/docs] Filtering guide - global filter, column filter, faceted filter
- [CITED: tremor.so/docs] Badge component - color variants, size options

### Tertiary (LOW confidence)
- [ASSUMED] Tremor 3.18.7 compatibility with Tailwind 4.x — needs testing
- [ASSUMED] lodash.debounce vs useDeferredValue preference — useDeferredValue is preferred

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in CLAUDE.md and verified on npm
- Architecture: HIGH — Server/Client component split is standard Next.js pattern
- Pitfalls: MEDIUM — some schema gaps (free tier, provider logos) need workarounds

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (30 days — stable stack, no fast-moving dependencies)
