'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

interface PipelineStats {
  totalProviders?: number;
  attempted?: number;
  succeeded?: number;
  failed?: number;
  extractions?: number;
  verifiedCount?: number;
  likelyCount?: number;
  lowConfidenceCount?: number;
}

interface PipelineRun {
  id: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  stats: PipelineStats | null;
}

interface PipelineRunsTableProps {
  runs: PipelineRun[];
}

export function PipelineRunsTable({ runs }: PipelineRunsTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  if (runs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No pipeline runs recorded</p>
        <p className="text-xs text-gray-400 mt-1">
          Pipeline runs will appear here after the first daily collection completes.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-600">✓</span>;
      case 'failed':
        return <span className="text-red-600">✗</span>;
      case 'running':
        return <span className="text-yellow-600">⟳</span>;
      default:
        return <span className="text-gray-400">?</span>;
    }
  };

  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    return formatDistanceToNow(start, { addSuffix: false });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-10">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Started</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Stats</th>
            <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRowId === run.id;
            return (
              <tr key={run.id} className="border-b border-gray-100">
                <td className="px-4 py-3">{getStatusIcon(run.status)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(run.startedAt), 'MMM d, yyyy h:mm a')}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {getDuration(run.startedAt, run.completedAt)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {run.stats ? `${run.stats.succeeded ?? 0}/${run.stats.totalProviders ?? 0}` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setExpandedRowId(isExpanded ? null : run.id)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Expanded detail - render below the table */}
      {expandedRowId !== null && (() => {
        const run = runs.find((r) => r.id === expandedRowId);
        if (!run?.stats) {
          return (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              No details available
            </div>
          );
        }

        return (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Provider Breakdown</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Attempted:</span>{' '}
                <span className="text-gray-900">{run.stats.attempted ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Succeeded:</span>{' '}
                <span className="text-green-600">{run.stats.succeeded ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>{' '}
                <span className="text-red-600">{run.stats.failed ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Extractions:</span>{' '}
                <span className="text-gray-900">{run.stats.extractions ?? 0}</span>
              </div>
            </div>
            {run.stats.verifiedCount !== undefined && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Verified:</span>{' '}
                  <span className="text-green-600">{run.stats.verifiedCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Likely:</span>{' '}
                  <span className="text-yellow-600">{run.stats.likelyCount ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Low Confidence:</span>{' '}
                  <span className="text-red-600">{run.stats.lowConfidenceCount ?? 0}</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
