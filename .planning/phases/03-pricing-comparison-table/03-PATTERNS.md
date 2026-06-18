# Phase 3: Pricing Comparison Table - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/components/PricingTable.tsx` | component | transform + request-response UI | `app/components/PricingTable.tsx` | exact |
| `app/components/HomePageClient.tsx` | component/provider | event-driven UI state | `app/components/HomePageClient.tsx` | exact |
| `app/components/CostCalculator.tsx` | component | transform + event-driven UI | `app/components/CostCalculator.tsx` | exact |
| `app/page.tsx` | route/server component | request-response + CRUD read | `app/page.tsx` | exact |
| `app/lib/pricing-utils.ts` | utility | transform | `app/lib/pricing-utils.ts` | exact |
| `app/lib/provider-metadata.ts` | utility | transform | `app/lib/provider-metadata.ts` | exact |
| `tests/components/pricing-table.test.tsx` | test | event-driven UI | `tests/cost-calculator.test.tsx` | role-match |
| `tests/fixtures/pricing-rows.ts` | test utility | transform | `tests/cost-calculator.test.tsx` | role-match |

## Pattern Assignments

### `app/components/PricingTable.tsx` (component, transform + request-response UI)

**Analog:** `app/components/PricingTable.tsx`

**Imports pattern** (lines 1-20):
```typescript
'use client';

import { useState, useDeferredValue, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
  type FilterFn,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import Link from 'next/link';
import { formatPrice, formatContextWindow, sanitizeDisplayName, getConfidenceColor, getModelFamily, formatCurrencyPrice } from '@/app/lib/pricing-utils';
import { getProviderLogo, getUniqueProviders } from '@/app/lib/provider-metadata';
import { generateSlug } from '@/app/lib/slug-utils';
```

**Module-level TanStack row model pattern** (lines 22-28):
```typescript
const coreRowModel = getCoreRowModel();
const sortedRowModel = getSortedRowModel();
const filteredRowModel = getFilteredRowModel();
const paginationRowModel = getPaginationRowModel();
```

**Canonical row type pattern** (lines 43-54):
```typescript
export interface PricingRow {
  id: number;
  sourceId: number;
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  collectedAt: Date;
  sourceName: string | null;
  sourceUrl: string | null;
}
```

**Responsive column pattern** (lines 65-77):
```typescript
function getColumnResponsiveClass(columnId: string): string {
  switch (columnId) {
    case 'family':
    case 'contextWindow':
      return 'hidden md:table-cell';
    case 'source':
      return 'hidden lg:table-cell';
    case 'collectedAt':
      return 'hidden xl:table-cell';
    default:
      return '';
  }
}
```

**State + deferred search pattern** (lines 149-168):
```typescript
export function PricingTable({ data, exchangeRate, currency, onCurrencyChange }: { data: PricingRow[]; exchangeRate?: number; currency?: 'usd' | 'vnd'; onCurrencyChange?: (currency: 'usd' | 'vnd') => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [freeTierOnly, setFreeTierOnly] = useState(false);
  const [inputPriceMin, setInputPriceMin] = useState('');
  const [inputPriceMax, setInputPriceMax] = useState('');
  const [outputPriceMin, setOutputPriceMin] = useState('');
  const [outputPriceMax, setOutputPriceMax] = useState('');
  const [contextWindowMin, setContextWindowMin] = useState('');
  const [contextWindowMax, setContextWindowMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [internalCurrency, setInternalCurrency] = useState<'usd' | 'vnd'>('usd');
  const effectiveCurrency = currency ?? internalCurrency;
  const handleCurrencyChange = onCurrencyChange ?? setInternalCurrency;
  const [pageSize] = useState(50);

  const deferredGlobalFilter = useDeferredValue(globalFilter);
```

**Pre-filter pipeline pattern** (lines 172-220):
```typescript
const preFilteredData = useMemo(() => {
  let result = data;

  if (freeTierOnly) {
    result = result.filter((row) => {
      return row.inputPricePer1m === 0 && row.outputPricePer1m === 0;
    });
  }

  const inputMin = inputPriceMin !== '' ? parseFloat(inputPriceMin) : null;
  const inputMax = inputPriceMax !== '' ? parseFloat(inputPriceMax) : null;
  if (inputMin !== null || inputMax !== null) {
    result = result.filter((row) => {
      if (row.inputPricePer1m === null) return true;
      if (inputMin !== null && row.inputPricePer1m < inputMin) return false;
      if (inputMax !== null && row.inputPricePer1m > inputMax) return false;
      return true;
    });
  }

  return result;
}, [data, freeTierOnly, inputPriceMin, inputPriceMax, outputPriceMin, outputPriceMax, contextWindowMin, contextWindowMax]);
```

**Column cell patterns** (lines 243-305):
```typescript
columnHelper.accessor('modelName', {
  header: 'Model',
  cell: (info) => {
    const row = info.row.original;
    const slug = generateSlug(row.modelName, row.sourceId);
    return (
      <Link
        href={`/model/${slug}`}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {sanitizeDisplayName(info.getValue())}
      </Link>
    );
  },
}),
columnHelper.accessor('confidence', {
  header: 'Confidence',
  cell: (info) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(
        info.getValue()
      )}`}
      title={CONFIDENCE_TOOLTIPS[info.getValue()] ?? info.getValue()}
    >
      {info.getValue()}
    </span>
  ),
}),
```

**Safe source link pattern** (lines 306-335):
```typescript
columnHelper.accessor('sourceUrl', {
  id: 'source',
  header: 'Source',
  enableSorting: false,
  cell: (info) => {
    const url = info.getValue();
    const row = info.row.original;
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return <span className="text-sm text-gray-400">{row.sourceName ?? '—'}</span>;
        }
      } catch {
        return <span className="text-sm text-gray-400">{row.sourceName ?? '—'}</span>;
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 underline">
          {row.sourceName ?? 'View source'}
        </a>
      );
    }
    return <span className="text-sm text-gray-400">{'—'}</span>;
  },
}),
```

**Table options pattern** (lines 356-380):
```typescript
const tableOptions = useMemo(
  () => ({
    data: preFilteredData,
    columns,
    state: {
      sorting,
      globalFilter: deferredGlobalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    getPaginationRowModel: paginationRowModel,
    initialState: {
      pagination: { pageSize },
    },
    globalFilterFn: 'includesString' as const,
    autoResetPageIndex: true,
  }),
  [preFilteredData, columns, sorting, deferredGlobalFilter, columnFilters, pageSize]
);

const table = useReactTable(tableOptions);
```

**Controls, accessibility, and pagination pattern** (lines 424-494, 647-668):
```typescript
<div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
  <input
    type="text"
    placeholder="Search models or providers..."
    value={globalFilter}
    onChange={(e) => setGlobalFilter(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    aria-label="Search models or providers"
  />
  <select
    value={providerFilter}
    onChange={(e) => setProviderFilter(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
    aria-label="Filter by provider"
  >
    <option value="">All Providers</option>
  </select>
</div>

<div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
  <p className="text-sm text-gray-500">
    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
  </p>
  <div className="flex gap-2">
    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
      Previous
    </button>
    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
      Next
    </button>
  </div>
</div>
```

### `app/components/HomePageClient.tsx` (component/provider, event-driven UI state)

**Analog:** `app/components/HomePageClient.tsx`

**Imports and prop typing pattern** (lines 1-23):
```typescript
'use client';

import { useState } from 'react';
import { PricingTable, type PricingRow } from '@/app/components/PricingTable';
import { CostCalculator } from '@/app/components/CostCalculator';

export function HomePageClient({
  data,
  exchangeRate,
}: {
  data: PricingRow[];
  exchangeRate: number;
}) {
```

**Lifted shared state pattern** (lines 24-42):
```typescript
const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

<PricingTable
  data={data}
  exchangeRate={exchangeRate}
  currency={currency}
  onCurrencyChange={setCurrency}
/>
```

**Side-by-side layout pattern** (lines 27-63):
```typescript
<div className="max-w-[1600px] mx-auto px-4 pb-8">
  <div className="flex flex-col xl:flex-row gap-6">
    <div className="xl:w-[60%] xl:min-w-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Latest Pricing Data
      </h2>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <PricingTable data={data} exchangeRate={exchangeRate} currency={currency} onCurrencyChange={setCurrency} />
      </div>
    </div>

    <div className="xl:w-[40%] xl:min-w-0">
      <div className="xl:sticky xl:top-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <CostCalculator data={data} currency={currency} exchangeRate={exchangeRate} />
        </div>
      </div>
    </div>
  </div>
</div>
```

### `app/components/CostCalculator.tsx` (component, transform + event-driven UI)

**Analog:** `app/components/CostCalculator.tsx`

**Imports and derived data pattern** (lines 1-47):
```typescript
'use client';

import { useState, useMemo } from 'react';
import { COST_SCENARIOS, CostScenario } from '@/app/lib/cost-scenarios';
import {
  calculateScenarioCosts,
  formatCurrencyPrice,
  sanitizeDisplayName,
  getConfidenceColor,
  PracticalCost,
} from '@/app/lib/pricing-utils';
import type { PricingRow } from '@/app/components/PricingTable';

const [selectedScenario, setSelectedScenario] = useState<string>(
  COST_SCENARIOS[0].id
);

const scenario = useMemo(
  () => COST_SCENARIOS.find((s) => s.id === selectedScenario) ?? COST_SCENARIOS[0],
  [selectedScenario]
);

const costs = useMemo(
  () => calculateScenarioCosts(data, scenario.inputTokens, scenario.outputTokens),
  [data, scenario.inputTokens, scenario.outputTokens]
);
```

**Accessible segmented/tab control pattern** (lines 52-68):
```typescript
<div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Cost scenarios">
  {COST_SCENARIOS.map((s: CostScenario) => (
    <button
      key={s.id}
      type="button"
      role="tab"
      aria-selected={selectedScenario === s.id}
      onClick={() => setSelectedScenario(s.id)}
      className={`rounded-lg px-4 py-2 text-sm transition-colors ${
        selectedScenario === s.id
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {s.name}
    </button>
  ))}
</div>
```

### `app/page.tsx` (route/server component, request-response + CRUD read)

**Analog:** `app/page.tsx`

**Imports and ISR pattern** (lines 1-14):
```typescript
import { db } from '@/src/db/index';
import { extractions, sources } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { format } from 'date-fns';
import { type PricingRow } from '@/app/components/PricingTable';
import { HomePageClient } from '@/app/components/HomePageClient';
import { getLatestExchangeRate, FALLBACK_RATE } from '@/src/pipeline/exchange-rate-worker';

export const revalidate = 60;
```

**Defensive DB query pattern** (lines 22-59):
```typescript
export default async function HomePage() {
  let pricingData: PricingRow[] = [];
  let lastUpdated: Date | null = null;
  let exchangeRate: number = FALLBACK_RATE;

  try {
    const rows = await db
      .select({
        id: extractions.id,
        sourceId: extractions.sourceId,
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

    pricingData = rows.map((row) => ({
      ...row,
      collectedAt: new Date(row.collectedAt),
    }));
  } catch {
    pricingData = [];
  }
```

**Independent fallback pattern for exchange rate** (lines 61-67):
```typescript
try {
  exchangeRate = await getLatestExchangeRate();
} catch {
  exchangeRate = FALLBACK_RATE;
}
```

**Server-to-client prop handoff pattern** (lines 69-81):
```typescript
return (
  <main className="min-h-screen bg-white text-gray-900">
    <div className="flex flex-col items-center justify-center py-5 px-4">
      <h1 className="text-2xl font-bold tracking-tight">AI Daily</h1>
      <p className="mt-1 text-sm text-gray-500">
        Last updated: {lastUpdated ? format(lastUpdated, 'MMM d, yyyy h:mm a') : 'Unknown'}
      </p>
    </div>

    <HomePageClient data={pricingData} exchangeRate={exchangeRate} />
  </main>
);
```

### `app/lib/pricing-utils.ts` (utility, transform)

**Analog:** `app/lib/pricing-utils.ts`

**Imports and pure utility style** (lines 1-18):
```typescript
/**
 * Shared pricing utility functions for AI Daily.
 * Used by both server components (page.tsx) and client components (PricingTable.tsx).
 */

import type { PricingRow } from '@/app/components/PricingTable';

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return 'N/A';
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}
```

**Formatting and status mapping pattern** (lines 26-68):
```typescript
export function formatContextWindow(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return 'N/A';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'likely':
      return 'bg-yellow-100 text-yellow-800';
    case 'low_confidence':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
```

**Currency entry point pattern** (lines 83-115):
```typescript
export function convertToVND(price: number | null | undefined, rate?: number): number | null {
  if (price === null || price === undefined) return null;
  return price * (rate ?? USD_VND_RATE);
}

export function formatCurrencyPrice(price: number | null | undefined, currency: 'usd' | 'vnd', rate?: number): string {
  if (currency === 'vnd') {
    const effectiveRate = rate ?? USD_VND_RATE;
    if (!Number.isFinite(effectiveRate)) return formatPrice(price);
    return formatVND(convertToVND(price, rate));
  }
  return formatPrice(price);
}
```

**Family/search helper pattern** (lines 123-140):
```typescript
export function getModelFamily(modelName: string): string {
  const name = modelName.toLowerCase();

  if (name.startsWith('claude-3.5') || name.startsWith('claude-3.6')) return 'Claude 3.5';
  if (name.startsWith('claude-3')) return 'Claude 3';
  if (name.startsWith('gpt-4')) return 'GPT-4';
  if (name.startsWith('gemini')) return 'Gemini';
  if (name.startsWith('mistral')) return 'Mistral';

  return 'Other';
}
```

### `app/lib/provider-metadata.ts` (utility, transform)

**Analog:** `app/lib/provider-metadata.ts`

**Static metadata map pattern** (lines 1-35):
```typescript
/**
 * Provider metadata: logo paths and display name normalization.
 * Used by PricingTable to render provider logos alongside names.
 */

import type { PricingRow } from '@/app/components/PricingTable';

export const providerLogos: Record<string, string> = {
  'openai': '/logos/openai.svg',
  'anthropic': '/logos/anthropic.svg',
  'google': '/logos/google.svg',
  'google gemini': '/logos/google.svg',
  'mistral': '/logos/mistral.svg',
  'amazon bedrock': '/logos/amazon.svg',
};
```

**Lookup and unique extraction pattern** (lines 42-59):
```typescript
export function getProviderLogo(providerName: string): string | null {
  const normalized = providerName.toLowerCase().trim();
  return providerLogos[normalized] ?? null;
}

export function getUniqueProviders(data: PricingRow[]): string[] {
  const providers = new Set<string>();
  for (const row of data) {
    if (row.sourceName) {
      providers.add(row.sourceName);
    }
  }
  return Array.from(providers).sort((a, b) => a.localeCompare(b));
}
```

### `tests/components/pricing-table.test.tsx` (test, event-driven UI)

**Analog:** `tests/cost-calculator.test.tsx`

**Test imports pattern** (lines 1-6):
```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CostCalculator } from '../app/components/CostCalculator';
import type { PricingRow } from '../app/components/PricingTable';
```

**Reusable mock data factory pattern** (lines 8-60):
```typescript
function createMockData(): PricingRow[] {
  return [
    {
      id: 1,
      sourceId: 1,
      modelName: 'gpt-4o-mini',
      inputPricePer1m: 0.15,
      outputPricePer1m: 0.6,
      contextWindow: 128000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com',
    },
  ];
}
```

**Interaction test pattern** (lines 126-136):
```typescript
it('clicking a scenario updates selection', async () => {
  const user = userEvent.setup();
  render(<CostCalculator data={[]} currency="usd" />);

  const codingAgentTab = screen.getByRole('tab', { name: '1 Coding-Agent Session' });
  await user.click(codingAgentTab);

  expect(codingAgentTab.getAttribute('aria-selected')).toBe('true');
  const firstTab = screen.getByRole('tab', { name: '10 Long Prompts' });
  expect(firstTab.getAttribute('aria-selected')).toBe('false');
});
```

**Query/exclusion assertion pattern** (lines 168-176):
```typescript
it('null-pricing models are excluded', () => {
  const data = createDataWithNulls();
  render(<CostCalculator data={data} currency="usd" />);

  expect(screen.getByText(/gpt-4o-mini/)).toBeDefined();
  expect(screen.queryByText(/unknown-model/)).toBeNull();
  expect(screen.queryByText(/another-null/)).toBeNull();
});
```

### `tests/fixtures/pricing-rows.ts` (test utility, transform)

**Analog:** `tests/cost-calculator.test.tsx`

**Use the same `PricingRow` object shape as component tests** (lines 8-34):
```typescript
function createMockData(): PricingRow[] {
  return [
    {
      id: 1,
      sourceId: 1,
      modelName: 'gpt-4o-mini',
      inputPricePer1m: 0.15,
      outputPricePer1m: 0.6,
      contextWindow: 128000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com',
    },
    {
      id: 2,
      sourceId: 2,
      modelName: 'claude-3.5-sonnet',
      inputPricePer1m: 3,
      outputPricePer1m: 15,
      contextWindow: 200000,
      confidence: 'verified',
      collectedAt: new Date('2026-06-01'),
      sourceName: 'Anthropic',
      sourceUrl: 'https://anthropic.com',
    },
  ];
}
```

## Shared Patterns

### Server/Client Split

**Source:** `app/page.tsx` + `app/components/HomePageClient.tsx`
**Apply to:** `app/page.tsx`, `app/components/HomePageClient.tsx`, `app/components/PricingTable.tsx`, `app/components/CostCalculator.tsx`

Server component performs Drizzle reads and fallback handling, then passes plain props to client components. Client components own interactive state only.

### Currency State

**Source:** `app/components/HomePageClient.tsx` lines 24-42
**Apply to:** Pricing table and cost calculator surfaces

Lift `currency` into `HomePageClient` and pass `currency`, `exchangeRate`, and `onCurrencyChange` down instead of duplicating toggles.

### Formatting and Sanitization

**Source:** `app/lib/pricing-utils.ts` lines 14-18, 26-30, 43-50, 108-115
**Apply to:** All visible model names, provider names, prices, and context windows

Use `sanitizeDisplayName()`, `formatCurrencyPrice()`, and `formatContextWindow()` rather than formatting inline.

### Safe External Links

**Source:** `app/components/PricingTable.tsx` lines 306-335
**Apply to:** Source attribution links

Validate `http:`/`https:` protocols before rendering links. Use `target="_blank"` with `rel="noopener noreferrer"` and show provider names, not raw URLs.

### Error Handling

**Source:** `app/page.tsx` lines 29-67
**Apply to:** DB reads and exchange-rate reads

Use separate `try/catch` blocks so exchange-rate failure does not hide pricing data, and DB failure falls back to an empty table state.

### Testing

**Source:** `tests/cost-calculator.test.tsx`, `tests/components/pricing-grid.test.tsx`, `tests/pricing-utils.test.ts`
**Apply to:** Pricing table interaction tests and utility tests

Use Vitest with jsdom for component tests, Testing Library queries, `userEvent` for clicks/typing, and reusable `PricingRow` fixtures.

## Dirty Worktree Context

Current dirty files at mapping time:

| File | Status | Planner Guidance |
|------|--------|------------------|
| `.planning/STATE.md` | modified | Planning state; do not revert unless workflow requires it. |
| `.planning/phases/03-pricing-comparison-table/03-STITCH-INTEGRATION-PLAN.md` | deleted | Matches D-29 Stitch cleanup context. |
| `.planning/phases/03-pricing-comparison-table/03-STITCH-INTEGRATION-RESEARCH.md` | deleted | Matches D-29 Stitch cleanup context. |
| `.planning/phases/03-pricing-comparison-table/03-STITCH-INTEGRATION-SUMMARY.md` | deleted | Matches D-29 Stitch cleanup context. |
| `app/components/HomePageClient.tsx` | modified | Treat as user/current phase work; inspect before editing. |
| `app/components/PricingTable.tsx` | modified | Treat as user/current phase work; inspect before editing. |
| `app/page.tsx` | modified | Treat as user/current phase work; inspect before editing. |

## No Analog Found

None. All planned files have same-file or close role analogs in the codebase.

## Metadata

**Analog search scope:** `app/`, `app/components/`, `app/lib/`, `tests/`, `tests/components/`, planning phase docs
**Files scanned:** 71 from `rg --files`
**Pattern extraction date:** 2026-06-16
