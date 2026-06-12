'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
} from '@tanstack/react-table';
import { formatPrice, formatContextWindow, sanitizeDisplayName, getConfidenceColor, getModelFamily } from '@/app/lib/pricing-utils';

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
 * Sort indicator arrow for column headers.
 */
function SortIndicator({ column }: { column: Column<PricingRow, unknown> }) {
  const sorted = column.getIsSorted();
  if (!sorted) return <span className="ml-1 text-gray-300">&#8597;</span>;
  return (
    <span className="ml-1 text-gray-700">
      {sorted === 'asc' ? '&#9650;' : '&#9660;'}
    </span>
  );
}

/**
 * Interactive client-side pricing table with @tanstack/react-table sorting.
 * Renders extraction data with provider name, model, family, prices,
 * context window, and confidence badge.
 *
 * Per PRIC-01: Comparison table with sortable columns.
 * Per D-01: Client component receiving data from server via props.
 */
export function PricingTable({ data, lastUpdated }: { data: PricingRow[]; lastUpdated: Date | null }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    columnHelper.accessor('sourceName', {
      header: 'Provider',
      cell: (info) => (
        <span className="text-sm text-gray-700">
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
      header: 'Input ($/1M)',
      cell: (info) => (
        <span className="text-sm text-right text-gray-700 block">
          {formatPrice(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('outputPricePer1m', {
      header: 'Output ($/1M)',
      cell: (info) => (
        <span className="text-sm text-right text-gray-700 block">
          {formatPrice(info.getValue())}
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
        >
          {info.getValue()}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      {lastUpdated && (
        <p className="text-sm text-gray-500 mb-4 text-center">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}

      {data.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">
            No pricing data collected yet. Pipeline will run shortly.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gray-50 border-b-2 border-gray-200">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100 transition-colors ${
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
                      className={`px-4 py-3 ${
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
      )}
    </div>
  );
}
