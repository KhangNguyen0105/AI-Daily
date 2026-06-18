'use client';

import React, { useState, useMemo, Fragment } from 'react';
import { format } from 'date-fns';

interface Source {
  id: number;
  name: string;
  url: string;
  providerType: string;
  isActive: number;
  updatedAt: string;
}

interface SourcesTableProps {
  sources: Source[];
  onToggleTrust: (id: number, isActive: boolean) => Promise<void>;
}

export function SourcesTable({ sources, onToggleTrust }: SourcesTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loadingToggleId, setLoadingToggleId] = useState<number | null>(null);

  // Get unique provider types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(sources.map((s) => s.providerType));
    return Array.from(types).sort();
  }, [sources]);

  // Apply filters
  const filtered = useMemo(() => {
    return sources.filter((source) => {
      if (statusFilter === 'active' && source.isActive !== 1) return false;
      if (statusFilter === 'inactive' && source.isActive !== 0) return false;
      if (typeFilter !== 'all' && source.providerType !== typeFilter) return false;
      return true;
    });
  }, [sources, statusFilter, typeFilter]);

  const handleToggle = async (id: number, currentState: boolean) => {
    setLoadingToggleId(id);
    try {
      await onToggleTrust(id, !currentState);
    } finally {
      setLoadingToggleId(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border-secondary rounded-md text-sm bg-bg-primary"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border-secondary rounded-md text-sm bg-bg-primary"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-text-secondary">No sources found</p>
          <p className="text-xs text-text-tertiary mt-1">
            {sources.length === 0
              ? 'No sources have been configured yet. Check that providers have been configured.'
              : 'Try adjusting your filters to see more sources.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
      <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Last</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Trust</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((source) => {
              const isExpanded = expandedRowId === source.id;
              return (
                <Fragment key={source.id}>
                  <tr
                    onClick={() => setExpandedRowId(isExpanded ? null : source.id)}
                    className={`border-b border-border-primary cursor-pointer hover:bg-bg-secondary transition-colors ${
                      isExpanded ? 'bg-bg-secondary' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-text-primary">{source.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{source.providerType}</td>
                    <td className="px-4 py-3">
                      {source.isActive === 1 ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-badge-green-bg text-badge-green-text rounded">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {format(new Date(source.updatedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        role="switch"
                        aria-checked={source.isActive === 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(source.id, source.isActive === 1);
                        }}
                        disabled={loadingToggleId === source.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          source.isActive === 1 ? 'bg-accent-blue' : 'bg-bg-tertiary'
                        } ${loadingToggleId === source.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-bg-primary shadow transition-transform ${
                            source.isActive === 1 ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="p-0 border-b border-border-primary">
                        <div className="px-4 py-4 bg-bg-secondary/80 shadow-inner">
                          <div className="text-sm space-y-2">
                            <p className="flex items-center">
                              <span className="text-text-secondary w-24">URL:</span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-blue hover:text-accent-blue/80 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {source.url}
                              </a>
                            </p>
                            <p className="flex items-center">
                              <span className="text-text-secondary w-24">Last updated:</span>
                              <span className="text-text-primary font-medium">
                                {format(new Date(source.updatedAt), 'MMM d, yyyy h:mm a')}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
