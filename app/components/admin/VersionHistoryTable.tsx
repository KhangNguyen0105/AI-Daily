'use client';

import { format } from 'date-fns';

interface Version {
  id: number;
  version: number;
  title: string;
  createdAt: string;
}

interface VersionHistoryTableProps {
  versions: Version[];
  onRollback: (versionId: number) => void;
  currentVersion: number;
}

export function VersionHistoryTable({ versions, onRollback, currentVersion }: VersionHistoryTableProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No previous versions</p>
        <p className="text-xs text-gray-400 mt-1">
          This article has not been edited yet. Save changes to create a version history.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Version</th>
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
          <th className="text-right py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((version) => {
          const isCurrent = version.version === currentVersion;
          return (
            <tr key={version.id} className="border-b border-gray-100">
              <td className="py-2 text-gray-900">v{version.version}</td>
              <td className="py-2 text-gray-600">
                {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
              </td>
              <td className="py-2 text-gray-600 max-w-xs truncate">{version.title}</td>
              <td className="py-2 text-right">
                {isCurrent ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => onRollback(version.id)}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Rollback to This Version
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
