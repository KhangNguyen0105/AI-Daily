'use client';

import { useState, useDeferredValue, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
  type FilterFn,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { formatPrice, formatContextWindow, sanitizeDisplayName, getConfidenceColor, getModelFamily, formatCurrencyPrice } from '@/app/lib/pricing-utils';
import { getProviderLogo, getUniqueProviders } from '@/app/lib/provider-metadata';

/**
 * Tooltip text explaining each confidence level.
 */
const CONFIDENCE_TOOLTIPS: Record<string, string> = {
  verified: 'Verified: Data confirmed by multiple sources or official documentation',
  likely: 'Likely: Data from a single reliable source',
  low_confidence: 'Low confidence: Data may be incomplete or unverified',
};

/**
 * Row type matching the shape passed from the server component.
 * Derived from Drizzle JOIN query (extractions + sources).
 */
export interface PricingRow {
  id: number;
  modelName: string;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
  contextWindow: number | null;
  confidence: 'verified' | 'likely' | 'low_confidence';
  collectedAt: Date;
  sourceName: string | null;
  sourceUrl: string | null;
}

const columnHelper = createColumnHelper<PricingRow>();

/**
 * Responsive column visibility classes.
 * Provider, Model, Input, Output, Confidence: always visible.
 * Family, Context Window: hidden below md.
 * Source: hidden below lg.
 * Collected: hidden below xl.
 */
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

/**
 * Minimum column widths to prevent excessive collapse on small screens.
 */
function getColumnMinWidth(columnId: string): string {
  switch (columnId) {
    case 'modelName':
      return 'min-w-[120px]';
    case 'inputPricePer1m':
    case 'outputPricePer1m':
      return 'min-w-[80px]';
    default:
      return '';
  }
}

/**
 * Sort indicator arrow for column headers.
 */
function SortIndicator({ column }: { column: Column<PricingRow, unknown> }) {
  const sorted = column.getIsSorted();
  if (!sorted) return <span className="ml-1 text-gray-300">&#8597;</span>;
  return (
    <span className="ml-1 text-gray-700">
      {sorted === 'asc' ? '▲' : '▼'}
    </span>
  );
}

/**
 * Provider logo component: renders a 24x24 logo image or a fallback initial circle.
 */
function ProviderLogo({ name }: { name: string }) {
  const logoPath = getProviderLogo(name);
  const displayName = sanitizeDisplayName(name ?? 'Unknown');
  const initial = displayName.charAt(0).toUpperCase();

  if (logoPath) {
    return (
      <img
        src={logoPath}
        alt={`${displayName} logo`}
        width={24}
        height={24}
        className="rounded-full mr-2 inline-block align-middle"
      />
    );
  }

  // Fallback: colored circle with initial letter
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 text-white text-xs font-semibold mr-2 align-middle"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

/**
 * Interactive client-side pricing table with search, filters, provider logos,
 * and model family grouping. Uses @tanstack/react-table for sorting and
 * global/column filtering.
 *
 * Per PRIC-01: Comparison table with sortable columns.
 * Per PRIC-02: Model family grouping.
 * Per PRIC-03: Provider logos.
 * Per PRIC-04: Search, provider filter, price range, context window, free tier.
 * Per D-01: Client component receiving data from server via props.
 */
export function PricingTable({ data }: { data: PricingRow[] }) {
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
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  // Deferred search value for performance (debounce without external dependency)
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  // Unique providers for the dropdown
  const uniqueProviders = useMemo(() => getUniqueProviders(data), [data]);

  // Pre-filter pipeline (applied before useReactTable)
  const preFilteredData = useMemo(() => {
    let result = data;

    // 1. Free tier filter
    if (freeTierOnly) {
      result = result.filter((row) => {
        return row.inputPricePer1m === 0 && row.outputPricePer1m === 0;
      });
    }

    // 2. Price range filter (input price)
    const inputMin = inputPriceMin !== '' ? parseFloat(inputPriceMin) : null;
    const inputMax = inputPriceMax !== '' ? parseFloat(inputPriceMax) : null;
    if (inputMin !== null || inputMax !== null) {
      result = result.filter((row) => {
        if (row.inputPricePer1m === null) return true; // null values pass through
        if (inputMin !== null && row.inputPricePer1m < inputMin) return false;
        if (inputMax !== null && row.inputPricePer1m > inputMax) return false;
        return true;
      });
    }

    // 3. Price range filter (output price)
    const outputMin = outputPriceMin !== '' ? parseFloat(outputPriceMin) : null;
    const outputMax = outputPriceMax !== '' ? parseFloat(outputPriceMax) : null;
    if (outputMin !== null || outputMax !== null) {
      result = result.filter((row) => {
        if (row.outputPricePer1m === null) return true; // null values pass through
        if (outputMin !== null && row.outputPricePer1m < outputMin) return false;
        if (outputMax !== null && row.outputPricePer1m > outputMax) return false;
        return true;
      });
    }

    // 4. Context window filter
    const ctxMin = contextWindowMin !== '' ? parseFloat(contextWindowMin) : null;
    const ctxMax = contextWindowMax !== '' ? parseFloat(contextWindowMax) : null;
    if (ctxMin !== null || ctxMax !== null) {
      result = result.filter((row) => {
        if (row.contextWindow === null) return true; // null values pass through
        if (ctxMin !== null && row.contextWindow < ctxMin) return false;
        if (ctxMax !== null && row.contextWindow > ctxMax) return false;
        return true;
      });
    }

    return result;
  }, [data, freeTierOnly, inputPriceMin, inputPriceMax, outputPriceMin, outputPriceMax, contextWindowMin, contextWindowMax]);

  // Provider column filter function (matches TanStack FilterFn signature)
  const providerColumnFilterFn = useCallback(
    (row: { getValue: (id: string) => unknown }, _columnId: string) => {
      if (!providerFilter) return true;
      const sourceName = row.getValue('sourceName') as string | null;
      return sourceName === providerFilter;
    },
    [providerFilter]
  );

  const columns = useMemo(() => [
    columnHelper.accessor('sourceName', {
      header: 'Provider',
      filterFn: providerColumnFilterFn as FilterFn<PricingRow>,
      cell: (info) => (
        <span className="text-sm text-gray-700 flex items-center">
          <ProviderLogo name={info.getValue() ?? 'Unknown'} />
          {sanitizeDisplayName(info.getValue() ?? 'Unknown')}
        </span>
      ),
    }),
    columnHelper.accessor('modelName', {
      header: 'Model',
      cell: (info) => (
        <span className="text-sm font-medium text-gray-900">
          {sanitizeDisplayName(info.getValue())}
        </span>
      ),
    }),
    // Family column: derives family from the same modelName field used by the Model column.
    // Uses id: 'family' to differentiate the two accessors on the same data field.
    columnHelper.accessor('modelName', {
      id: 'family',
      header: 'Family',
      cell: (info) => (
        <span className="text-sm text-gray-600">
          {getModelFamily(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('inputPricePer1m', {
      header: currency === 'usd' ? 'Input ($/1M)' : 'Input (₫/1M)',
      cell: (info) => (
        <span className="text-sm text-right text-gray-700 block">
          {formatCurrencyPrice(info.getValue(), currency)}
        </span>
      ),
    }),
    columnHelper.accessor('outputPricePer1m', {
      header: currency === 'usd' ? 'Output ($/1M)' : 'Output (₫/1M)',
      cell: (info) => (
        <span className="text-sm text-right text-gray-700 block">
          {formatCurrencyPrice(info.getValue(), currency)}
        </span>
      ),
    }),
    columnHelper.accessor('contextWindow', {
      header: 'Context Window',
      cell: (info) => (
        <span className="text-sm text-right text-gray-700 block">
          {formatContextWindow(info.getValue())}
        </span>
      ),
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
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {row.sourceName ?? 'View source'}
            </a>
          );
        }
        return <span className="text-sm text-gray-400">{'—'}</span>;
      },
    }),
    columnHelper.accessor('collectedAt', {
      header: 'Collected',
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <span className="text-sm text-gray-400">{'—'}</span>;
        return (
          <span className="text-sm text-gray-600">
            {format(new Date(date), 'MMM d, yyyy')}
          </span>
        );
      },
      sortingFn: 'datetime',
    }),
  ], [providerColumnFilterFn, currency]);

  const table = useReactTable({
    data: preFilteredData,
    columns,
    state: {
      sorting,
      globalFilter: deferredGlobalFilter,
      columnFilters: providerFilter ? [{ id: 'sourceName', value: providerFilter }] : [],
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const filteredRowCount = table.getRowModel().rows.length;
  const totalRowCount = data.length;

  /**
   * Reset all filters to defaults.
   */
  const clearFilters = useCallback(() => {
    setGlobalFilter('');
    setProviderFilter('');
    setFreeTierOnly(false);
    setInputPriceMin('');
    setInputPriceMax('');
    setOutputPriceMin('');
    setOutputPriceMax('');
    setContextWindowMin('');
    setContextWindowMax('');
  }, []);

  const hasActiveFilters =
    globalFilter !== '' ||
    providerFilter !== '' ||
    freeTierOnly ||
    inputPriceMin !== '' ||
    inputPriceMax !== '' ||
    outputPriceMin !== '' ||
    outputPriceMax !== '' ||
    contextWindowMin !== '' ||
    contextWindowMax !== '';

  return (
    <div>
      {data.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">
            No pricing data collected yet. Pipeline will run shortly.
          </p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="mb-4 space-y-3">
            {/* Top row: search + provider + free tier + clear */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Search models or providers..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search models or providers"
                />
              </div>

              {/* Currency toggle */}
              <div className="flex" role="group" aria-label="Toggle currency">
                <button
                  type="button"
                  onClick={() => setCurrency('usd')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border transition-colors ${
                    currency === 'usd'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('vnd')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-b border-r transition-colors ${
                    currency === 'vnd'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  VND
                </button>
              </div>

              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                aria-label="Filter by provider"
              >
                <option value="">All Providers</option>
                {uniqueProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeTierOnly}
                  onChange={(e) => setFreeTierOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Free tier only
              </label>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
                  aria-label="Clear all filters"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              aria-expanded={showAdvancedFilters}
            >
              <span className="text-xs">{showAdvancedFilters ? '▲' : '▼'}</span>
              Advanced Filters
            </button>

            {/* Advanced filters: price range + context window */}
            {showAdvancedFilters && (
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-end p-3 bg-gray-50 rounded-md">
                <fieldset className="flex flex-col gap-1">
                  <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Input Price ($/1M)</legend>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={inputPriceMin}
                      onChange={(e) => setInputPriceMin(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      aria-label="Input price minimum"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={inputPriceMax}
                      onChange={(e) => setInputPriceMax(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      aria-label="Input price maximum"
                    />
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-1">
                  <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output Price ($/1M)</legend>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={outputPriceMin}
                      onChange={(e) => setOutputPriceMin(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      aria-label="Output price minimum"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={outputPriceMax}
                      onChange={(e) => setOutputPriceMax(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      aria-label="Output price maximum"
                    />
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-1">
                  <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Context Window (tokens)</legend>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={contextWindowMin}
                      onChange={(e) => setContextWindowMin(e.target.value)}
                      className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="1000"
                      aria-label="Context window minimum"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={contextWindowMax}
                      onChange={(e) => setContextWindowMax(e.target.value)}
                      className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="1000"
                      aria-label="Context window maximum"
                    />
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          {/* Row count indicator */}
          <p className="text-sm text-gray-500 mb-3">
            Showing {filteredRowCount} of {totalRowCount} models
          </p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-gray-50 border-b-2 border-gray-200">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors sticky top-0 z-10 bg-gray-50 ${getColumnResponsiveClass(header.id)} ${getColumnMinWidth(header.id)} ${
                          header.id === 'inputPricePer1m' || header.id === 'outputPricePer1m' || header.id === 'contextWindow'
                            ? 'text-right'
                            : header.id === 'confidence'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIndicator column={header.column} />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 ${getColumnResponsiveClass(cell.column.id)} ${getColumnMinWidth(cell.column.id)} ${
                          cell.column.id === 'inputPricePer1m' || cell.column.id === 'outputPricePer1m' || cell.column.id === 'contextWindow'
                            ? 'text-right'
                            : cell.column.id === 'confidence'
                            ? 'text-center'
                            : ''
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
