'use client';

import { useState, useMemo } from 'react';
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

  if (sources.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No sources found</p>
        <p className="text-xs text-gray-400 mt-1">
          Try adjusting your filters, or check that providers have been configured.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Last</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Trust</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((source) => {
              const isExpanded = expandedRowId === source.id;
              return (
                <tr key={source.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{source.name}</td>
                  <td className="px-4 py-3 text-gray-600">{source.providerType}</td>
                  <td className="px-4 py-3">
                    {source.isActive === 1 ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(source.updatedAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      role="switch"
                      aria-checked={source.isActive === 1}
                      onClick={() => handleToggle(source.id, source.isActive === 1)}
                      disabled={loadingToggleId === source.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        source.isActive === 1 ? 'bg-blue-600' : 'bg-gray-300'
                      } ${loadingToggleId === source.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          source.isActive === 1 ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setExpandedRowId(isExpanded ? null : source.id)}
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

        {/* Expanded details */}
        {expandedRowId !== null && (() => {
          const source = sources.find((s) => s.id === expandedRowId);
          if (!source) return null;

          return (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">URL:</span>{' '}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    {source.url}
                  </a>
                </p>
                <p>
                  <span className="text-gray-500">Last updated:</span>{' '}
                  <span className="text-gray-900">{format(new Date(source.updatedAt), 'MMM d, yyyy h:mm a')}</span>
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
