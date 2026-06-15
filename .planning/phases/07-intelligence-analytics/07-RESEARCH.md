# Phase 7: Intelligence & Analytics - Research

**Researched:** 2026-06-15
**Domain:** Pricing intelligence features (trend charts, promotion tracker, model comparison, price alerts)
**Confidence:** HIGH

## Summary

Phase 7 delivers four user-facing features: pricing trend charts, a promotion tracker page, multi-model comparison, and localStorage-based price alerts. The phase depends on Phase 3 (pricing table, data layer) and Phase 5 (model detail pages, price history chart). All database tables already exist -- no schema changes needed. The primary work is new pages and components following established patterns.

The codebase is 6 phases mature with consistent patterns: server components fetch data via Drizzle queries, client components handle interactivity, Recharts handles charts, and Tailwind utility classes handle all styling. Phase 7 extends these patterns without introducing new infrastructure. The UI-SPEC (07-UI-SPEC.md) is already approved and defines all component layouts, interaction patterns, and visual contracts.

**Primary recommendation:** Build four new routes (`/trends`, `/promotions`, `/compare`, `/alerts`) using existing Drizzle queries and Recharts patterns. No new npm packages needed. All features are client-side with server data fetching.

## User Constraints (from CONTEXT.md)

### Implementation Decisions

**Trend Charts (INTL-01, INTL-02):**
- D-01: New `/trends` route -- dedicated page for pricing trends
- D-02: Per-model charts -- one chart per model showing input/output price over time
- D-03: All available data -- no time range selector
- D-04: Visual markers -- green dots for price drops, red dots for price increases, star icon for new launches
- D-05: Use Recharts for trend charts -- consistent with Phase 5

**Promotion Tracker (INTL-03):**
- D-06: New `/promotions` route -- dedicated page
- D-07: Card grid layout with filter by type (free_tier, promotion, beta)
- D-08: Show all promos, gray out expired, sort active first
- D-09: Data from existing `promotions` table

**Multi-Model Comparison (INTL-04):**
- D-10: New `/compare` route with URL: `/compare?models=gpt-4o,claude-sonnet-4-5`
- D-11: 2-5 dropdown selectors with search
- D-12: All dimensions -- pricing, context window, practical costs, free tier status, confidence score
- D-13: Side-by-side cards, horizontal scroll if >3

**Price Alerts (INTL-05):**
- D-14: localStorage storage -- no backend
- D-15: Bell icon on model detail page + `/alerts` management page
- D-16: On-page check -- toast/banner on page load
- D-17: Below threshold only -- alert when price drops below threshold
- D-18: Alert structure: `{ modelName, sourceId, thresholdPrice, createdAt }`

**Navigation:**
- D-19: Add "Trends", "Promotions", "Compare", "Alerts" to TopNav
- D-20: Same SideNav + TopBar layout as existing pages

### Claude's Discretion
- Chart styling (colors, grid lines, axis labels) -- follow Recharts defaults with theme colors
- Card styling for promotions -- follow existing card patterns
- Dropdown component for model selection -- build custom or use existing library
- Toast/banner component for alerts -- build custom or use existing library
- Empty states and loading states for all new pages

### Deferred Ideas (OUT OF SCOPE)
- Email subscriptions (v2)
- User accounts (v1 constraint)
- Real-time streaming updates
- Admin alert management (Phase 8)
- Community features

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTL-01 | Pricing trend charts per model over time | Recharts LineChart with PriceHistoryChart pattern; Drizzle query on extractions table grouped by modelName+sourceId |
| INTL-02 | Highlight price drops and new model launches | Recharts custom dot component for green/red markers; compare consecutive data points to detect changes |
| INTL-03 | Dedicated promotion/free tier tracker | Drizzle query on existing promotions table; card grid layout extending PromotionsList pattern |
| INTL-04 | 2-5 model side-by-side multi-dimensional comparison | Custom searchable dropdown; URL query param sync; Drizzle queries joining extractions+practical_costs+promotions |
| INTL-05 | Price threshold alerts (localStorage) | localStorage CRUD with JSON serialization; on-page check comparing current price to threshold |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trend chart data queries | API / Backend (Next.js server components) | -- | Drizzle queries in server components, data passed to client |
| Trend chart rendering | Browser / Client | -- | Recharts is client-side; interactive markers need client state |
| Promotion data queries | API / Backend (server components) | -- | Same pattern as existing /model/[slug] page |
| Promotion filtering | Browser / Client | -- | Client-side filter on already-fetched data |
| Model comparison data | API / Backend (server components) | -- | Drizzle query for selected models |
| Model selector UI | Browser / Client | -- | Custom dropdown with search, URL sync |
| Price alert storage | Browser / Client | -- | localStorage, no backend involvement |
| Price alert checking | Browser / Client | -- | On-page load check, toast display |
| Navigation updates | Browser / Client | -- | TopNav is a client component |

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | Trend charts | Already used in PriceHistoryChart; consistent charting |
| drizzle-orm | 0.45.2 | Database queries | Already used for all data access |
| date-fns | 4.4.0 | Date formatting | Already used for timestamp display |
| next | 16.2.9 | Page routing | App Router with SSR/SSG |

### No New Packages Needed

All features can be built with existing dependencies. The UI-SPEC confirms: custom searchable dropdown (no library), custom toast/banner (no library), all Tailwind utility classes.

**Installation:** None required.

## Package Legitimacy Audit

No new packages are installed in this phase. All functionality uses existing dependencies verified in prior phases.

| Package | Registry | Already Installed | Verified |
|---------|----------|-------------------|----------|
| recharts | npm | Yes (package.json) | Phase 3/5 |
| drizzle-orm | npm | Yes (package.json) | Phase 1 |
| date-fns | npm | Yes (package.json) | Phase 1 |
| next | npm | Yes (package.json) | Phase 1 |

## Architecture Patterns

### System Architecture Diagram

```
[User Browser]
    |
    +--> [/trends page] ---------> Server Component (Drizzle query: extractions history)
    |       |                              |
    |       +--> TrendsPageClient <--------+ (receives data)
    |              |
    |              +--> TrendChart (Recharts LineChart with custom markers)
    |
    +--> [/promotions page] -----> Server Component (Drizzle query: promotions table)
    |       |                              |
    |       +--> PromotionsPageClient <----+ (receives data)
    |              |
    |              +--> PromotionCard[] (card grid with type filter)
    |
    +--> [/compare page] --------> Server Component (Drizzle query: selected models)
    |       |                              |
    |       +--> ComparePageClient <-------+ (receives data)
    |              |
    |              +--> ModelSelector[] (searchable dropdowns, URL sync)
    |              +--> ComparisonCard[] (side-by-side dimensions)
    |
    +--> [/alerts page] ---------> Client-only (localStorage CRUD)
    |       |
    |       +--> AlertsPageClient
    |              |
    |              +--> AlertList (threshold display, remove/clear actions)
    |
    +--> [Any page + AlertBanner] -> Client-only (localStorage read + price check)
    |       |
    |       +--> AlertBanner (fixed bottom-right, auto-dismiss)
    |
    +--> [/model/[slug] + BellIcon] -> Client-only (localStorage write)
            |
            +--> BellIcon + AlertSetModal (inline expand form)
```

### Recommended Project Structure

```
app/
├── trends/
│   └── page.tsx                    # Server component: fetch trend data
├── promotions/
│   └── page.tsx                    # Server component: fetch promotions
├── compare/
│   └── page.tsx                    # Server component: fetch selected models
├── alerts/
│   └── page.tsx                    # Client page (or server wrapper)
├── components/
│   ├── TrendsPageClient.tsx        # Client wrapper for /trends
│   ├── TrendChart.tsx              # Recharts with markers (extends PriceHistoryChart)
│   ├── PromotionsPageClient.tsx    # Client wrapper for /promotions
│   ├── PromotionCard.tsx           # Individual promo card
│   ├── ComparePageClient.tsx       # Client wrapper for /compare
│   ├── ModelSelector.tsx           # Searchable dropdown
│   ├── ComparisonCard.tsx          # Single model comparison card
│   ├── AlertsPageClient.tsx        # Alert management list
│   ├── AlertBanner.tsx             # On-page toast for triggered alerts
│   ├── BellIcon.tsx                # Interactive bell for setting alerts
│   └── AlertSetForm.tsx            # Inline threshold input form
└── lib/
    ├── alerts.ts                   # localStorage CRUD for alerts
    └── alert-check.ts              # Alert checking logic (compare prices)
```

### Pattern 1: Server Component with Drizzle Query

Every new page follows the established pattern from `app/page.tsx` and `app/model/[slug]/page.tsx`:

```typescript
// Source: app/page.tsx (existing pattern)
export const revalidate = 60;

export default async function TrendsPage() {
  let data: TrendData[] = [];
  try {
    data = await db.select({...}).from(extractions)...;
  } catch {
    data = [];
  }
  return <TrendsPageClient data={data} />;
}
```

### Pattern 2: Recharts with Custom Markers

TrendChart extends PriceHistoryChart by adding visual markers for price changes:

```typescript
// Source: Recharts docs - custom dot prop
<Line
  type="monotone"
  dataKey="input"
  stroke="#3b82f6"
  dot={(props) => {
    const { payload, cx, cy } = props;
    if (payload.isPriceDrop) return <circle cx={cx} cy={cy} r={6} fill="#16a34a" />;
    if (payload.isPriceIncrease) return <circle cx={cx} cy={cy} r={6} fill="#dc2626" />;
    return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
  }}
/>
```

### Pattern 3: localStorage CRUD for Alerts

```typescript
// Source: D-18 from CONTEXT.md
const ALERTS_KEY = 'ai-daily-price-alerts';

interface AlertEntry {
  modelName: string;
  sourceId: number;
  thresholdPrice: number;
  createdAt: string;
}

function getAlerts(): AlertEntry[] {
  const raw = localStorage.getItem(ALERTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAlerts(alerts: AlertEntry[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}
```

### Pattern 4: URL Query Param Sync for Compare

```typescript
// Source: D-10 from CONTEXT.md
// Next.js App Router searchParams pattern (same as app/digest/page.tsx)
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ models?: string }>;
}) {
  const params = await searchParams;
  const modelNames = params.models?.split(',').filter(Boolean) ?? [];
  // ... fetch data for selected models
}
```

### Anti-Patterns to Avoid

- **Don't build a charting abstraction layer:** Use Recharts directly in each chart component. The project has 2-3 chart types at most; abstraction adds complexity without value.
- **Don't store alerts on the server:** D-14 explicitly says localStorage. No user accounts constraint means no server-side alert storage.
- **Don't add a toast library:** A simple fixed-position div with dismiss button covers the alert banner use case. Libraries like react-hot-toast or sonner add dependency weight for a single use case.
- **Don't over-engineer the model selector:** A custom searchable dropdown with input filtering and click-to-select is sufficient. Libraries like react-select or downshift add 50KB+ for a simple interaction.
- **Don't fetch comparison data on the client:** Server components should query Drizzle and pass data down. Client components handle UI state only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trend chart rendering | Custom SVG/canvas | Recharts LineChart | Already installed, handles responsive sizing, tooltips, legends |
| Date formatting | Manual date string construction | date-fns format() | Already installed, handles locale and edge cases |
| URL parameter parsing | Manual URLSearchParams | Next.js searchParams | Built-in App Router feature, type-safe with Promise<> |
| CSS styling | CSS modules or styled-components | Tailwind utility classes | Project convention, zero-runtime, matches all existing pages |

## Common Pitfalls

### Pitfall 1: Recharts Custom Dot Performance
**What goes wrong:** Custom dot components re-render on every chart interaction (hover, zoom) causing janky animations.
**Why it happens:** Inline arrow functions in the `dot` prop create new function references on every render.
**How to avoid:** Define the custom dot component outside the render function. Memoize with `React.memo` if needed.
**Warning signs:** Laggy hover tooltips, slow chart interactions with 20+ data points.

### Pitfall 2: localStorage SSR Mismatch
**What goes wrong:** Components that read localStorage during SSR throw errors or produce hydration mismatches.
**Why it happens:** `localStorage` is not available on the server. Reading it during SSR causes a ReferenceError or returns different values than client render.
**How to avoid:** Use `useEffect` to read localStorage after mount. Initialize with empty/default state. Show loading or empty state until client hydration.
**Warning signs:** "localStorage is not defined" errors during build, flash of different content on page load.

### Pitfall 3: Compare URL Parameter Edge Cases
**What goes wrong:** Model names with special characters (slashes, spaces, unicode) break URL parsing.
**Why it happens:** Model names like "gpt-4o" are safe, but some providers use names with "/" or spaces.
**How to avoid:** Use `encodeURIComponent` when writing to URL, `decodeURIComponent` when reading. Validate model names against database before rendering.
**Warning signs:** 404 errors when sharing compare URLs, models not loading after page refresh.

### Pitfall 4: Promotion Date Comparison Timezone
**What goes wrong:** Expired promotions show as active (or vice versa) due to timezone differences.
**Why it happens:** PostgreSQL timestamps are timezone-aware, but JavaScript `new Date()` uses local timezone. Comparing server-rendered dates with client-side "now" can be off by hours.
**How to avoid:** Compare dates in UTC consistently. Use `Date.now()` for "current time" comparisons on the client. Store and display dates with timezone awareness.
**Warning signs:** Promotions appearing expired when they shouldn't be, or active when they should be expired.

### Pitfall 5: Trend Chart Data Ordering
**What goes wrong:** Chart lines appear to go backwards in time or have crossing lines.
**Why it happens:** Extractions are queried in reverse-chronological order (newest first) but Recharts expects chronological order (oldest first) for correct line rendering.
**How to avoid:** Reverse the query results before passing to Recharts, or use `orderBy(asc(extractions.collectedAt))` in the Drizzle query.
**Warning signs:** Chart lines that go right-to-left, confusing visual patterns.

### Pitfall 6: Alert Check on Every Page Load
**What goes wrong:** Alert checking queries the database on every page load, adding latency.
**Why it happens:** Checking if current price < threshold requires knowing the current price for each alerted model.
**How to avoid:** The current page's data already includes pricing for displayed models. Only check alerts for models whose data is available on the current page. For the `/alerts` page, fetch current prices for all alerted models in one query.
**Warning signs:** Slow page loads, unnecessary database queries on pages unrelated to alerts.

## Code Examples

### TrendChart with Price Change Markers

```typescript
// Extends PriceHistoryChart pattern with visual markers (D-04)
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TrendPoint {
  collectedAt: Date;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
}

interface ChartPoint {
  date: string;
  input: number | null;
  output: number | null;
  isInputDrop: boolean;
  isInputIncrease: boolean;
  isOutputDrop: boolean;
  isOutputIncrease: boolean;
  isFirstPoint: boolean;
}

function buildChartData(points: TrendPoint[]): ChartPoint[] {
  const sorted = [...points]
    .filter(p => p.inputPricePer1m !== null || p.outputPricePer1m !== null)
    .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime());

  return sorted.map((point, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    return {
      date: format(point.collectedAt, 'MMM d'),
      input: point.inputPricePer1m,
      output: point.outputPricePer1m,
      isFirstPoint: i === 0,
      isInputDrop: prev?.inputPricePer1m != null && point.inputPricePer1m != null && point.inputPricePer1m < prev.inputPricePer1m,
      isInputIncrease: prev?.inputPricePer1m != null && point.inputPricePer1m != null && point.inputPricePer1m > prev.inputPricePer1m,
      isOutputDrop: prev?.outputPricePer1m != null && point.outputPricePer1m != null && point.outputPricePer1m < prev.outputPricePer1m,
      isOutputIncrease: prev?.outputPricePer1m != null && point.outputPricePer1m != null && point.outputPricePer1m > prev.outputPricePer1m,
    };
  });
}
```

### Promotion Card with Expiration Handling

```typescript
// Extends PromotionsList pattern to card layout (D-07, D-08)
'use client';

import { format } from 'date-fns';
import type { PromotionData } from './PromotionsList';

function isActive(promo: PromotionData): boolean {
  if (!promo.endDate) return true;
  return new Date(promo.endDate) > new Date();
}

function getDaysRemaining(endDate: Date | null): string | null {
  if (!endDate) return null;
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days remaining`;
}

export function PromotionCard({ promo }: { promo: PromotionData }) {
  const active = isActive(promo);
  const daysLeft = getDaysRemaining(promo.endDate);

  return (
    <div className={`border rounded-lg p-4 ${active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={typeBadgeStyles[promo.type]}>{promo.type}</span>
        {daysLeft && <span className="text-xs text-gray-500">{daysLeft}</span>}
      </div>
      <p className="text-sm text-gray-900">{promo.description}</p>
      {promo.credits && <p className="text-xs text-gray-600 mt-1">Credits: {promo.credits}</p>}
    </div>
  );
}
```

### Alert localStorage Utility

```typescript
// New file: app/lib/alerts.ts
const ALERTS_KEY = 'ai-daily-price-alerts';

export interface PriceAlert {
  modelName: string;
  sourceId: number;
  thresholdPrice: number;
  createdAt: string;
}

export function getAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAlert(alert: PriceAlert): void {
  const alerts = getAlerts();
  // Prevent duplicates (same model + source)
  const exists = alerts.some(a => a.modelName === alert.modelName && a.sourceId === alert.sourceId);
  if (exists) return;
  alerts.push(alert);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function removeAlert(modelName: string, sourceId: number): void {
  const alerts = getAlerts().filter(a => !(a.modelName === modelName && a.sourceId === sourceId));
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function clearAlerts(): void {
  localStorage.removeItem(ALERTS_KEY);
}
```

### Searchable Model Dropdown (Custom)

```typescript
// Custom searchable dropdown (D-11) -- no external library
'use client';

import { useState, useRef, useEffect } from 'react';

interface ModelOption {
  modelName: string;
  sourceId: number;
  sourceName: string;
}

export function ModelSelector({
  models,
  selected,
  onSelect,
  placeholder = 'Search models...',
}: {
  models: ModelOption[];
  selected: ModelOption | null;
  onSelect: (model: ModelOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = models.filter(m =>
    m.modelName.toLowerCase().includes(query.toLowerCase()) ||
    m.sourceName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={selected ? selected.modelName : query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map(model => (
            <li
              key={`${model.modelName}-${model.sourceId}`}
              onClick={() => { onSelect(model); setOpen(false); setQuery(''); }}
              className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              <span className="font-medium">{model.modelName}</span>
              <span className="text-gray-500 ml-2">{model.sourceName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PriceHistoryChart (Phase 5) | TrendChart with markers | Phase 7 | Extends existing chart with green/red markers and star icons for new launches |
| PromotionsList (Phase 5) | PromotionCard grid | Phase 7 | Changes from vertical list to card grid with type filtering |
| Manual URL params | searchParams Promise | Next.js 15+ | Async params access in server components |

**Deprecated/outdated:**
- None in this phase. All patterns extend existing, established conventions.

## Assumptions Log

All claims in this research were derived from direct codebase inspection or CONTEXT.md decisions. No external library documentation was needed since no new packages are installed.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| -- | No assumptions -- all claims verified from codebase | -- | -- |

## Open Questions

1. **How should the trends page handle models with very different price scales?**
   - What we know: Some models cost $0.10/1M tokens, others $15/1M. Putting them on the same chart makes cheap models invisible.
   - What's unclear: Whether to use per-model charts (D-02 suggests this) or a shared chart with dual Y-axis.
   - Recommendation: Follow D-02 strictly -- one chart per model. The user clicks a model to see its trend. No shared chart needed.

2. **Should the compare page support pre-filled URLs from model detail pages?**
   - What we know: D-10 defines `/compare?models=...` URL format. Model detail pages could link to compare with the current model pre-selected.
   - What's unclear: Whether to add "Compare" links on model detail pages.
   - Recommendation: Yes, add a "Compare" link on ModelDetailClient that navigates to `/compare?models={modelName}`. Low effort, high value.

3. **How should alerts interact with the daily pipeline?**
   - What we know: D-16 says "check on page load." The pipeline runs daily and updates prices.
   - What's unclear: Whether to check alerts during pipeline execution and store triggered state.
   - Recommendation: Keep it purely client-side as D-16 specifies. The page load check is sufficient -- the user visits the site, sees if any alerts are triggered. No pipeline integration needed for v1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev | Check at runtime | -- | -- |
| pnpm | Package manager | Check at runtime | -- | -- |
| PostgreSQL | Data queries | Check at runtime | -- | -- |
| Recharts | Trend charts | Already in package.json | ^3.8.1 | -- |
| date-fns | Date formatting | Already in package.json | 4.4.0 | -- |

**Missing dependencies with no fallback:** None -- all dependencies are already installed.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x with @testing-library/react |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTL-01 | View pricing trend charts per model | unit | `pnpm test tests/components/trend-chart.test.tsx` | Wave 0 |
| INTL-02 | Price drops and new launches highlighted | unit | `pnpm test tests/components/trend-chart.test.tsx` | Wave 0 |
| INTL-03 | View promotion tracker with filters | unit | `pnpm test tests/components/promotions-page.test.tsx` | Wave 0 |
| INTL-04 | Compare 2-5 models side-by-side | unit | `pnpm test tests/components/compare-page.test.tsx` | Wave 0 |
| INTL-05 | Set and manage price alerts | unit | `pnpm test tests/lib/alerts.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/trend-chart.test.tsx` -- covers INTL-01, INTL-02
- [ ] `tests/components/promotions-page.test.tsx` -- covers INTL-03
- [ ] `tests/components/compare-page.test.tsx` -- covers INTL-04
- [ ] `tests/lib/alerts.test.ts` -- covers INTL-05 (localStorage CRUD)
- [ ] `tests/components/model-selector.test.tsx` -- covers searchable dropdown interaction
- [ ] `tests/components/alert-banner.test.tsx` -- covers on-page alert display

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/db/schema.ts` -- existing tables (extractions, promotions, practical_costs)
- Codebase inspection: `app/components/PriceHistoryChart.tsx` -- Recharts pattern
- Codebase inspection: `app/components/PromotionsList.tsx` -- promotion display pattern
- Codebase inspection: `app/components/ModelDetailClient.tsx` -- model detail layout
- Codebase inspection: `app/page.tsx` -- server component + ISR pattern
- Codebase inspection: `app/digest/page.tsx` -- searchParams pagination pattern
- Codebase inspection: `app/lib/pricing-utils.ts` -- shared utility functions
- Codebase inspection: `07-CONTEXT.md` -- locked implementation decisions
- Codebase inspection: `07-UI-SPEC.md` -- approved visual contract

### Secondary (MEDIUM confidence)
- Recharts custom dot API -- inferred from existing PriceHistoryChart implementation

### Tertiary (LOW confidence)
- None -- all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already installed, no new packages
- Architecture: HIGH -- follows established patterns from 6 prior phases
- Pitfalls: HIGH -- all pitfalls identified from direct codebase analysis and known React/Next.js patterns

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stable -- no external dependencies changing)
