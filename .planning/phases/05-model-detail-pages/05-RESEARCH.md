# Phase 5: Model Detail Pages - Research

**Researched:** 2026-06-14
**Domain:** Dynamic routing, data visualization, schema design
**Confidence:** HIGH

## Summary

Phase 5 delivers per-model profile pages that let users drill into a specific model's full pricing details, historical price trends, active promotions/free tier status, and provider links. The page is accessible by clicking a model name in the PricingTable and shares the same layout as the landing page.

The implementation requires: (1) a new dynamic route at `/model/[slug]` using Next.js 16's `generateStaticParams` + ISR pattern, (2) a Recharts dual-line chart for price history derived from the existing `extractions` table, (3) a new `promotions` Drizzle schema table, (4) model name slugification utilities, and (5) provider link construction from existing provider metadata.

**Current layout state:** The root layout (`app/layout.tsx`) is minimal — just `<html><body>{children}</body></html>`. There are no SideNav, TopBar, or Footer components in the codebase. D-03 says "Same SideNav + TopBar layout as the landing page" but the landing page has no such components. The model detail page should follow the same minimal layout and add its own "Back to pricing" navigation link (D-12). If a shared layout shell is desired, it should be built as part of this phase or deferred.

**Primary recommendation:** Follow the established server-component-fetches-data, client-component-renders pattern. Recharts must be in a `'use client'` component. Derive price history from `extractions` table (no new table). Add `promotions` table with Drizzle schema.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** URL pattern is `/model/[slug]` — human-readable, SEO-friendly. Use `generateStaticParams` for known models with ISR revalidation.
- **D-02:** Navigation entry point is clicking model names in the PricingTable — model names become `<Link>` elements pointing to `/model/[slug]`.
- **D-03:** Same SideNav + TopBar layout as the landing page. Consistent look, easy to navigate back.
- **D-04:** Handle same-name models from different providers by appending provider suffix when conflicts exist (e.g., `gpt-4o` vs `gpt-4o-azure`).
- **D-05:** Derive price history from existing `extractions` table using `collectedAt` timestamps — no new table needed.
- **D-06:** Show all available history data points — no time range selector.
- **D-07:** Use Recharts for the price history line chart. Dual-line chart with input price and output price as two lines.
- **D-08:** Filter history by model name + source (provider) — not aggregated across providers.
- **D-09:** New `promotions` table with full schema: `sourceId`, `modelPattern`, `type`, `description`, `credits`, `startDate`, `endDate`, `sourceUrl`.
- **D-10:** Promotion data is collected automatically via the pipeline.
- **D-11:** Full detail page with sections: Hero → Pricing grid → Price history chart → Specifications → Promotions → Provider links → Digest mentions.
- **D-12:** Hero section: large model name, provider badge, confidence indicator, "Back to pricing" link.
- **D-13:** Pricing grid: 3 cards (Input $/1M, Output $/1M, Context Window) with currency toggle.
- **D-14:** Price history chart: dual-line chart (input + output prices over time). X-axis: dates, Y-axis: price. Hover tooltip shows exact values.

### Claude's Discretion

- Slug generation strategy for model names (normalize, lowercase, hyphenate)
- Chart styling (colors, grid lines, axis labels) — follow Recharts defaults with theme colors
- Empty states for missing data (no history, no promotions, no digest mentions)
- Loading states and error handling for the detail page

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MDTL-01 | Model detail page with current pricing (input/output/cache tiers) | Reuse `formatPrice`, `formatCurrencyPrice` from `pricing-utils.ts`. Server component fetches latest extraction by model name + source. |
| MDTL-02 | Line chart showing model's price changes over time | Recharts `LineChart` with dual `Line` components. Query `extractions` ordered by `collectedAt`. |
| MDTL-03 | Context window, model family, and release date display | Reuse `formatContextWindow`, `getModelFamily` from `pricing-utils.ts`. Release date from `collectedAt` of first extraction. |
| MDTL-04 | Active free tier and promotion status display | New `promotions` table. Query by `sourceId` + `modelPattern`. Display active vs expired with visual cues. |
| MDTL-05 | Links to provider docs, API, playground, and recent digest mentions | Provider link map derived from existing `sources.url` and provider configs. Digest mentions from `articles` table (Phase 6 dependency — stub for now). |
| MDTL-06 | Navigation from pricing table to model detail | Change `<span>` to `<Link>` in `PricingTable.tsx` model name column. |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.9 | Dynamic routing, ISR | Already in project. `generateStaticParams` + `revalidate` pattern. |
| drizzle-orm | 0.45.2 | Schema, queries | Already in project. Add `promotions` table. |
| @tanstack/react-table | 8.21.3 | Table rendering | Already in project. PricingTable uses it. |
| date-fns | 4.4.0 | Date formatting | Already in project. `format()` for chart axes. |

### New Dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | Price history chart | CLAUDE.md mandated. React-native API, built on D3. `ResponsiveContainer` for responsive sizing. |

**Installation:**
```bash
pnpm add recharts
```

**Version verification:** `recharts@3.8.1` verified via `npm view recharts version`. Peer dependencies support React 19 (`"react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`). `react-is` available as transitive dependency at v17.0.2 (satisfies `^17.0.0`).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Disposition |
|---------|----------|-----|-----------|-------------|-------------|
| recharts | npm | 11 years (since 2015) | 3M+/week | github.com/recharts/recharts | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User clicks model name in PricingTable
         |
         v
  /model/[slug] page.tsx (Server Component)
         |
         +---> generateStaticParams() -- queries DB for all model slugs
         |
         +---> DB Query: latest extraction for this model + source
         +---> DB Query: all extractions for this model + source (history)
         +---> DB Query: promotions matching this model
         |
         v
  ModelDetailClient.tsx (Client Component)
         |
         +---> HeroSection: model name, provider badge, confidence, "Back to pricing"
         +---> PricingGrid: 3 cards with currency toggle
         +---> PriceHistoryChart: Recharts dual-line (client-only)
         +---> Specifications: context window, family, release date
         +---> PromotionsList: active/expired promotions
         +---> ProviderLinks: docs, API, playground
         +---> DigestMentions: recent articles (stub until Phase 6)
```

### Recommended Project Structure

```
app/
├── model/
│   └── [slug]/
│       └── page.tsx              # Server component: data fetching, generateStaticParams
├── components/
│   ├── PricingTable.tsx          # EXISTING: add <Link> to model names
│   ├── ModelDetailClient.tsx     # NEW: client wrapper for detail page
│   ├── PriceHistoryChart.tsx     # NEW: Recharts dual-line chart (client-only)
│   ├── PricingGrid.tsx           # NEW: 3-card pricing display
│   ├── PromotionsList.tsx        # NEW: active/expired promotions
│   └── ProviderLinks.tsx         # NEW: docs, API, playground links
├── lib/
│   ├── pricing-utils.ts          # EXISTING: reuse formatPrice, etc.
│   ├── slug.ts                   # NEW: slug generation and resolution
│   └── provider-links.ts         # NEW: provider URL construction
src/
├── db/
│   └── schema.ts                 # EXISTING: add promotions table
```

### Pattern 1: Dynamic Route with generateStaticParams + ISR

**What:** Next.js 16 App Router pattern for SEO-friendly dynamic pages with periodic revalidation.

**When to use:** Any page that needs to be pre-rendered for known URLs but should update periodically.

**Example:**
```typescript
// app/model/[slug]/page.tsx
// Source: Next.js 16 docs - https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
// VERIFIED: params is a Promise in Next.js 16, must await before accessing

import { db } from '@/src/db/index';
import { extractions, sources, promotions } from '@/src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateSlug, resolveSlug } from '@/app/lib/slug';
import { ModelDetailClient } from '@/app/components/ModelDetailClient';
import { notFound } from 'next/navigation';

export const revalidate = 60; // ISR: revalidate every 60 seconds

/**
 * Generate static params for all known models.
 * Next.js pre-renders these at build time.
 */
export async function generateStaticParams() {
  try {
    const rows = await db
      .select({ modelName: extractions.modelName, sourceId: extractions.sourceId })
      .from(extractions)
      .groupBy(extractions.modelName, extractions.sourceId);

    return rows.map((row) => ({
      slug: generateSlug(row.modelName, row.sourceId),
    }));
  } catch {
    return []; // DB not available during build
  }
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>; // VERIFIED: Next.js 16 params is async
}) {
  const { slug } = await params;
  const resolved = await resolveSlug(slug);

  if (!resolved) {
    notFound();
  }

  const { modelName, sourceId } = resolved;

  // Fetch latest extraction
  const [latest] = await db
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
    .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
    .orderBy(desc(extractions.collectedAt))
    .limit(1);

  if (!latest) {
    notFound();
  }

  // Fetch price history
  const history = await db
    .select({
      collectedAt: extractions.collectedAt,
      inputPricePer1m: extractions.inputPricePer1m,
      outputPricePer1m: extractions.outputPricePer1m,
    })
    .from(extractions)
    .where(and(eq(extractions.modelName, modelName), eq(extractions.sourceId, sourceId)))
    .orderBy(extractions.collectedAt);

  // Fetch promotions (table may not exist yet — graceful fallback)
  let activePromotions: Array<{
    id: number;
    modelPattern: string;
    type: string;
    description: string;
    credits: string | null;
    startDate: Date | null;
    endDate: Date | null;
    sourceUrl: string | null;
  }> = [];
  try {
    activePromotions = await db
      .select()
      .from(promotions)
      .where(eq(promotions.sourceId, sourceId));
  } catch {
    // promotions table may not exist yet
  }

  return (
    <ModelDetailClient
      model={latest}
      history={history}
      promotions={activePromotions}
    />
  );
}
```

**Key points:**
- [VERIFIED: Next.js 16 docs] `params` is a `Promise` in Next.js 15+ — must `await` before accessing properties
- [VERIFIED: Next.js 16 docs] `generateStaticParams` returns array of `{ slug: string }` objects
- [VERIFIED: Next.js 16 docs] `revalidate = 60` enables ISR without `dynamicParams = false`
- Wrap DB queries in try/catch for build-time safety
- Use `notFound()` for missing models (renders Next.js 404 page)

### Pattern 2: Recharts Dual-Line Chart in Next.js

**What:** Client-only chart component receiving data from server component via props.

**When to use:** Any data visualization in a Next.js App Router project.

**Example:**
```typescript
// app/components/PriceHistoryChart.tsx
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface HistoryPoint {
  collectedAt: Date;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
}

export function PriceHistoryChart({ data }: { data: HistoryPoint[] }) {
  const chartData = data
    .filter((point) => point.inputPricePer1m !== null || point.outputPricePer1m !== null)
    .map((point) => ({
      date: format(new Date(point.collectedAt), 'MMM d'),
      input: point.inputPricePer1m,
      output: point.outputPricePer1m,
    }));

  if (chartData.length < 2) {
    return (
      <div className="text-center py-8 text-gray-500">
        Price history will appear after multiple data collections.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="input"
          name="Input $/1M"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="output"
          name="Output $/1M"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Key points:**
- Must have `'use client'` directive — Recharts uses browser APIs
- `ResponsiveContainer` handles responsive sizing — set `width="100%"` and fixed `height`
- Do NOT place `ResponsiveContainer` inside a `display: flex` container without explicit dimensions
- Import `format` from `date-fns` for axis labels (already installed)
- Show empty state when `< 2` data points (a single point cannot form a line)
- Filter out null price values before charting

### Pattern 3: Drizzle Schema Addition (promotions table)

**What:** Adding a new table to an existing Drizzle schema with foreign key references.

**When to use:** Any new data entity that references existing tables.

**Example:**
```typescript
// src/db/schema.ts — add to existing file
// Source: Drizzle ORM docs - https://orm.drizzle.team/docs/column-types/pg

export const promotionTypeEnum = pgEnum('promotion_type', [
  'free_tier',
  'promotion',
  'beta',
]);

export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id')
    .references(() => sources.id)
    .notNull(),
  modelPattern: varchar('model_pattern', { length: 255 }).notNull(),
  type: promotionTypeEnum('type').notNull(),
  description: text('description').notNull(),
  credits: varchar('credits', { length: 255 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Migration:**
```bash
pnpm db:generate   # generates SQL migration file in ./drizzle/
pnpm db:push       # applies directly (dev mode, no migration file)
```

**Key points:**
- `pgEnum` for type safety on promotion types
- `modelPattern` stores regex/glob for matching model names
- Foreign key to `sources.id` for provider association
- `startDate`/`endDate` for active/expired status calculation
- `sourceUrl` for linking to promotion details
- Promotions table may not exist during early builds — wrap queries in try/catch

### Pattern 4: Slug Generation and Resolution

**What:** Convert model names to URL-safe slugs and resolve slugs back to model + source.

**When to use:** Any dynamic route that needs human-readable URLs from database values.

**Example:**
```typescript
// app/lib/slug.ts
import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a URL-safe slug from a model name and optional source ID.
 * Uses sourceId (numeric) rather than provider name to avoid ambiguity.
 *
 * Examples:
 *   ("gpt-4o", 1) -> "gpt-4o--1"
 *   ("Claude 3.5 Sonnet", 2) -> "claude-35-sonnet--2"
 *   ("gemini-1.5-pro", 3) -> "gemini-15-pro--3"
 */
export function generateSlug(modelName: string, sourceId: number): string {
  const modelSlug = modelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens

  return `${modelSlug}--${sourceId}`;
}

/**
 * Resolve a slug back to model name + source ID.
 * Slugs are formatted as "model-slug--sourceId".
 */
export async function resolveSlug(slug: string): Promise<{
  modelName: string;
  sourceId: number;
} | null> {
  const lastDoubleDash = slug.lastIndexOf('--');
  if (lastDoubleDash === -1) return null;

  const sourceIdStr = slug.slice(lastDoubleDash + 2);
  const sourceId = parseInt(sourceIdStr, 10);
  if (isNaN(sourceId)) return null;

  // Query for this specific source
  const rows = await db
    .select({
      modelName: extractions.modelName,
      sourceId: extractions.sourceId,
    })
    .from(extractions)
    .where(eq(extractions.sourceId, sourceId))
    .groupBy(extractions.modelName, extractions.sourceId);

  // Find the model whose slug matches
  for (const row of rows) {
    if (generateSlug(row.modelName, row.sourceId) === slug) {
      return { modelName: row.modelName, sourceId: row.sourceId };
    }
  }

  return null;
}
```

**Key points:**
- Uses `sourceId` (integer) as the disambiguator instead of provider name strings — simpler, unambiguous
- `generateSlug` is deterministic — same input always produces same output
- `resolveSlug` parses the sourceId from the slug, queries only extractions for that source, then matches by slug
- Build a slug index at build time for `generateStaticParams`

### Anti-Patterns to Avoid

- **Recharts in Server Components:** Recharts requires browser APIs. Always use `'use client'` directive.
- **Hardcoded slugs:** Don't hardcode slug mappings — derive from database at build time.
- **Missing try/catch in generateStaticParams:** DB may not be available during build. Always catch errors.
- **Forgetting `await params`:** In Next.js 15+, `params` is a Promise. Must `await` before accessing.
- **ResponsiveContainer in flex without dimensions:** Causes chart to not render. Always set explicit width/height.
- **Querying all rows for slug resolution:** Don't `SELECT *` then loop — use the sourceId from the slug to narrow the query first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG/canvas | Recharts `LineChart` | Handles responsiveness, tooltips, legends, animations |
| URL slugification | Custom regex chains | Simple `generateSlug()` utility | Edge cases with Unicode, special chars |
| Table rendering | Manual `<table>` HTML | Existing `@tanstack/react-table` | Already used in PricingTable, provides sorting/filtering |
| Date formatting | `Date.toLocaleString()` | `date-fns format()` | Already installed, tree-shakeable, consistent |

## Common Pitfalls

### Pitfall 1: Recharts Hydration Mismatch
**What goes wrong:** Chart renders differently on server vs client, causing hydration errors.
**Why it happens:** Recharts calculates dimensions based on browser viewport.
**How to avoid:** Use `'use client'` directive. If hydration errors persist, wrap in mounted check:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div className="h-[300px]" />; // skeleton
```
**Warning signs:** Console warnings about hydration mismatch, chart not rendering.

### Pitfall 2: generateStaticParams DB Unavailability
**What goes wrong:** Build fails because database is not available during `next build`.
**Why it happens:** `generateStaticParams` runs at build time when DB may not be accessible.
**How to avoid:** Wrap in try/catch, return empty array as fallback. ISR will catch up at runtime.
**Warning signs:** Build errors mentioning database connection.

### Pitfall 3: Slug Conflicts
**What goes wrong:** Two different models produce the same slug.
**Why it happens:** Model names like "gpt-4o" from OpenAI and "gpt-4o" from Azure produce identical slugs.
**How to avoid:** Append `--sourceId` suffix to every slug. Source IDs are unique integers — no ambiguity.
**Warning signs:** 404 errors when navigating to model detail pages.

### Pitfall 4: Price History Empty State
**What goes wrong:** Chart shows nothing for models with only one data point.
**Why it happens:** A single data point cannot form a line.
**How to avoid:** Show a message like "Price history will appear after multiple data collections" when `history.length < 2`.
**Warning signs:** Empty chart area, confusing UX.

### Pitfall 5: Promotions Table Not Yet Created
**What goes wrong:** Query fails because `promotions` table doesn't exist yet (first deployment before migration).
**Why it happens:** Schema migration hasn't been run yet.
**How to avoid:** Wrap promotions query in try/catch. Show empty promotions state on failure.
**Warning signs:** Database errors on model detail page load.

## Code Examples

### Verified patterns from existing codebase

#### Server Component Data Fetching Pattern
```typescript
// Source: app/page.tsx (existing pattern)
export default async function Page() {
  let data: DataType[] = [];

  try {
    const rows = await db
      .select({ /* columns */ })
      .from(extractions)
      .leftJoin(sources, eq(extractions.sourceId, sources.id))
      .orderBy(desc(extractions.collectedAt));

    data = rows.map((row) => ({ /* transform */ }));
  } catch {
    data = []; // DB not available during build
  }

  return <ClientComponent data={data} />;
}
```

#### Currency Toggle Pattern
```typescript
// Source: app/components/HomePageClient.tsx (existing pattern)
'use client';

export function DetailPageClient({ data, exchangeRate }: Props) {
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  return (
    <>
      <CurrencyToggle currency={currency} onChange={setCurrency} />
      <PricingGrid data={data} currency={currency} exchangeRate={exchangeRate} />
    </>
  );
}
```

#### Price Formatting Pattern
```typescript
// Source: app/lib/pricing-utils.ts (existing)
import { formatPrice, formatCurrencyPrice, formatContextWindow } from '@/app/lib/pricing-utils';

// Usage in component:
<span>{formatCurrencyPrice(model.inputPricePer1m, currency, exchangeRate)}</span>
<span>{formatContextWindow(model.contextWindow)}</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getStaticPaths` | `generateStaticParams` | Next.js 13 (App Router) | Different API shape, async params |
| Pages Router `getServerSideProps` | Server Components with `revalidate` | Next.js 13+ | Data fetching in component body |
| Chart.js | Recharts | — | React-native API, better Next.js integration |
| Synchronous `params` | Async `params` (Promise) | Next.js 15 | Must `await params` before accessing |

**Deprecated/outdated:**
- `getStaticPaths`: Replaced by `generateStaticParams` in App Router
- Synchronous `params`: In Next.js 15+, `params` is a Promise (accessing synchronously is deprecated)

## Assumptions Log

| # | Claim | Section | Status | Risk if Wrong |
|---|-------|---------|--------|---------------|
| A1 | `recharts@3.8.1` is compatible with Next.js 16 + React 19 | Standard Stack | [VERIFIED: npm registry] — peerDeps include `react: "^19.0.0"` | — |
| A2 | `generateStaticParams` returns `{ slug: string }` objects | Pattern 1 | [VERIFIED: Next.js 16 docs] | — |
| A3 | `params` is a `Promise` in Next.js 16 | Pattern 1 | [VERIFIED: Next.js 16 docs] — exact syntax: `params: Promise<{ slug: string }>` | — |
| A4 | `pgEnum` can be added to existing schema without breaking existing data | Pattern 3 | [ASSUMED] — Drizzle Kit generates `ALTER TYPE ... ADD VALUE` for new enum values | Migration may fail if enum already has conflicting values |
| A5 | Provider link URLs can be derived from existing provider configs | Provider Links | [ASSUMED] — configs have `baseUrl` and `pricingUrl` but not explicit `docsUrl`/`playgroundUrl` | May need to add explicit link fields or build a static map |

## Open Questions (RESOLVED)

1. **How to handle models that exist in multiple sources with different prices?** (RESOLVED)
   - What we know: D-08 says filter by model name + source
   - What's unclear: How to select which source to show by default
   - RESOLVED: Show the source with the most recent `collectedAt`. Allow source switching if multiple exist. Implemented via `sourceId` in slug format (`model-slug--sourceId`).

2. **What provider links to show (docs, API, playground)?** (RESOLVED)
   - What we know: D-05 says link to provider docs, API, playground
   - What's unclear: Where to get these URLs from
   - RESOLVED: Build a `providerLinks` map in `app/lib/provider-links.ts` using known provider URLs. Use `sources.url` as the pricing page link. Add docs/API/playground URLs as a hardcoded map keyed by provider name (same approach as `provider-metadata.ts`).

3. **How to handle digest mentions before Phase 6 is built?** (RESOLVED)
   - What we know: D-11 includes digest mentions section
   - What's unclear: Phase 6 (Daily Content Engine) is not yet built
   - RESOLVED: Show a placeholder "Daily digest mentions will appear here" section. Wire up to `articles` table once Phase 6 is complete.

4. **D-03 layout: no SideNav/TopBar exists in codebase?** (RESOLVED)
   - What we know: Root layout is minimal `<body>{children}</body>`
   - What's unclear: Whether D-03 expects this phase to create a shared layout shell
   - RESOLVED: Model detail page uses the same minimal root layout. Add a simple "Back to pricing" link in the hero section (D-12). Do not create a SideNav/TopBar in this phase — that's a separate concern.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | ✓ | v22+ | — |
| pnpm | Package install | ✓ | 9.x | npm |
| PostgreSQL | Database | ✓ | — | — |
| Recharts | Chart rendering | ✗ (not installed) | 3.8.1 | — |

**Missing dependencies with no fallback:**
- `recharts` — must install before implementing chart component

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x + @testing-library/react |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MDTL-01 | Model detail page shows current pricing | unit | `vitest run tests/model-detail.test.ts` | ❌ Wave 0 |
| MDTL-02 | Price history chart renders dual lines | unit | `vitest run tests/price-history-chart.test.tsx` | ❌ Wave 0 |
| MDTL-03 | Specifications section shows context window, family, release date | unit | `vitest run tests/model-detail.test.ts` | ❌ Wave 0 |
| MDTL-04 | Promotions section shows active/expired status | unit | `vitest run tests/promotions.test.ts` | ❌ Wave 0 |
| MDTL-05 | Provider links section renders | unit | `vitest run tests/provider-links.test.ts` | ❌ Wave 0 |
| MDTL-06 | PricingTable model names are links | unit | `vitest run tests/pricing-table-links.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/slug.test.ts` — covers slug generation and resolution
- [ ] `tests/model-detail.test.ts` — covers MDTL-01, MDTL-03
- [ ] `tests/price-history-chart.test.tsx` — covers MDTL-02
- [ ] `tests/promotions.test.ts` — covers MDTL-04
- [ ] `tests/provider-links.test.ts` — covers MDTL-05
- [ ] `tests/pricing-table-links.test.tsx` — covers MDTL-06
- [ ] Install recharts: `pnpm add recharts`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public read-only page |
| V3 Session Management | no | No sessions needed |
| V4 Access Control | no | Public read-only |
| V5 Input Validation | yes | Sanitize slug input, validate model names |
| V6 Cryptography | no | No sensitive data |

### Known Threat Patterns for Next.js Dynamic Routes

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slug injection | Tampering | Validate slug format (alphanumeric + hyphens + digits) before DB query |
| Unicode manipulation in model names | Elevation of Privilege | Reuse `sanitizeDisplayName()` from pricing-utils |
| SQL injection via slug | Tampering | Drizzle ORM parameterized queries (already used) |
| Path traversal via slug | Tampering | Next.js handles path normalization; slug format validation as defense-in-depth |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `app/page.tsx`, `app/components/PricingTable.tsx`, `app/lib/pricing-utils.ts`, `src/db/schema.ts`
- CLAUDE.md: Technology stack, version numbers, architecture decisions
- CONTEXT.md: Locked decisions D-01 through D-14

### Secondary (MEDIUM confidence)
- [VERIFIED: nextjs.org/docs] Next.js 16 docs: Dynamic routes, `generateStaticParams`, async `params`, `PageProps` helper
- [VERIFIED: npm registry] Recharts peer dependencies: `react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`
- Drizzle ORM docs: `pgTable`, `pgEnum`, foreign keys, migrations

### Tertiary (LOW confidence)
- WebSearch results on Recharts + Next.js integration patterns (verified against existing codebase patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project except recharts (mandated by CLAUDE.md, verified on npm)
- Architecture: HIGH — follows established patterns from page.tsx, PricingTable, HomePageClient
- Pitfalls: HIGH — common Next.js + Recharts issues well-documented, verified via official docs
- Dynamic routing: HIGH — `generateStaticParams` + async `params` verified against Next.js 16 official docs

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (30 days — stable stack)
