'use client';

import React, { useState, Fragment } from 'react';
import { format } from 'date-fns';

interface ErrorRun {
  id: number;
  startedAt: string;
  stats: {
    failed?: number;
    errorDetails?: Array<{ provider: string; error: string }>;
  } | null;
}

interface ErrorLogTableProps {
  errors: ErrorRun[];
}

export function ErrorLogTable({ errors }: ErrorLogTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (errors.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No errors recorded</p>
        <p className="text-xs text-gray-400 mt-1">
          All recent pipeline runs completed without errors.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Error</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((errorRun) => {
            const details = errorRun.stats?.errorDetails ?? [];
            if (details.length === 0) {
              const key = `unknown-${errorRun.id}`;
              const isExpanded = expandedRowId === key;
              return (
                <Fragment key={key}>
                  <tr 
                    onClick={() => setExpandedRowId(isExpanded ? null : key)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(errorRun.startedAt), 'h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">Unknown</td>
                    <td className="px-4 py-3 text-red-600 truncate max-w-xs">Pipeline run failed</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={3} className="p-0 border-b border-gray-200">
                        <div className="px-4 py-4 bg-gray-50/80 shadow-inner">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Error Details</h4>
                          <pre className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 whitespace-pre-wrap overflow-auto max-h-60">
                            Pipeline run failed without specific error details.
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            }

            return details.map((detail, idx) => {
              const key = `${errorRun.id}-${idx}`;
              const isExpanded = expandedRowId === key;
              return (
                <Fragment key={key}>
                  <tr 
                    onClick={() => setExpandedRowId(isExpanded ? null : key)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(errorRun.startedAt), 'h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{detail.provider}</td>
                    <td className="px-4 py-3 text-red-600 truncate max-w-xs">{detail.error}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={3} className="p-0 border-b border-gray-200">
                        <div className="px-4 py-4 bg-gray-50/80 shadow-inner">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Error Details</h4>
                          <pre className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 whitespace-pre-wrap overflow-auto max-h-60">
                            {detail.error}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
