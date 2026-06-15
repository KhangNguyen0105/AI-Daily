'use client';

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
              return (
                <tr key={errorRun.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(errorRun.startedAt), 'h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">Unknown</td>
                  <td className="px-4 py-3 text-red-600">Pipeline run failed</td>
                </tr>
              );
            }

            return details.map((detail, idx) => (
              <tr key={`${errorRun.id}-${idx}`} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(errorRun.startedAt), 'h:mm a')}
                </td>
                <td className="px-4 py-3 text-gray-600">{detail.provider}</td>
                <td className="px-4 py-3 text-red-600">{detail.error}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
