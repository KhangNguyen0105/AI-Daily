'use client';

import React, { useState, Fragment } from 'react';
import { format, differenceInSeconds } from 'date-fns';

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
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function PipelineRunsTable({ runs, onSuccess, onError }: PipelineRunsTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      const res = await fetch('/api/admin/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError?.(data.error ?? 'Failed to cancel pipeline run.');
      } else {
        onSuccess?.('Pipeline run cancelled successfully.');
      }
    } catch (err) {
      console.error('Failed to cancel run', err);
      onError?.('Failed to cancel pipeline run. Check the pipeline status and try again.');
    } finally {
      setCancellingId(null);
    }
  };

  if (runs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-secondary">No pipeline runs recorded</p>
        <p className="text-xs text-text-tertiary mt-1">
          Pipeline runs will appear here after the first daily collection completes.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-600">&#10003;</span>;
      case 'failed':
        return <span className="text-red-600">&#10007;</span>;
      case 'running':
        return <span className="text-yellow-600">&#10227;</span>;
      default:
        return <span className="text-text-tertiary">?</span>;
    }
  };

  // WR-01 fix: Calculate actual duration from startedAt to completedAt
  const getDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'In progress';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const seconds = differenceInSeconds(end, start);
    if (seconds < 0) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary bg-bg-secondary">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary w-10">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Started</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Duration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Stats</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRowId === run.id;
            return (
              <Fragment key={run.id}>
                <tr
                  onClick={() => setExpandedRowId(isExpanded ? null : run.id)}
                  className={`border-b border-border-primary cursor-pointer hover:bg-bg-secondary transition-colors ${
                    isExpanded ? 'bg-bg-secondary' : ''
                  }`}
                >
                  <td className="px-4 py-3">{getStatusIcon(run.status)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {format(new Date(run.startedAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {getDuration(run.startedAt, run.completedAt)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {run.stats ? `${run.stats.succeeded ?? 0}/${run.stats.totalProviders ?? 0}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {run.status === 'running' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(run.id);
                        }}
                        disabled={cancellingId === run.id}
                        className="mr-3 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                      >
                        {cancellingId === run.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
                
                {/* Expanded detail - render directly underneath the row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="p-0 border-b border-border-primary">
                      {!run.stats ? (
                        <div className="px-4 py-4 bg-bg-secondary text-sm text-text-secondary text-center">
                          No details available
                        </div>
                      ) : (
                        <div className="px-4 py-4 bg-bg-secondary/80 shadow-inner">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Provider Breakdown</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                            <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                              <div className="text-text-secondary text-xs mb-1">Attempted</div>
                              <div className="text-text-primary font-medium">{run.stats.attempted ?? 0}</div>
                            </div>
                            <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                              <div className="text-text-secondary text-xs mb-1">Succeeded</div>
                              <div className="text-green-600 font-medium">{run.stats.succeeded ?? 0}</div>
                            </div>
                            <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                              <div className="text-text-secondary text-xs mb-1">Failed</div>
                              <div className="text-red-600 font-medium">{run.stats.failed ?? 0}</div>
                            </div>
                            <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                              <div className="text-text-secondary text-xs mb-1">Extractions</div>
                              <div className="text-text-primary font-medium">{run.stats.extractions ?? 0}</div>
                            </div>
                          </div>
                          {run.stats.verifiedCount !== undefined && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                                <div className="text-text-secondary text-xs mb-1">Verified</div>
                                <div className="text-green-600 font-medium">{run.stats.verifiedCount}</div>
                              </div>
                              <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                                <div className="text-text-secondary text-xs mb-1">Likely</div>
                                <div className="text-yellow-600 font-medium">{run.stats.likelyCount ?? 0}</div>
                              </div>
                              <div className="bg-bg-primary p-3 rounded shadow-sm border border-border-primary">
                                <div className="text-text-secondary text-xs mb-1">Low Confidence</div>
                                <div className="text-red-600 font-medium">{run.stats.lowConfidenceCount ?? 0}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
