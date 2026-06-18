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
        <p className="text-sm text-text-secondary">No previous versions</p>
        <p className="text-xs text-text-tertiary mt-1">
          This article has not been edited yet. Save changes to create a version history.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-primary">
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Version</th>
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Date</th>
          <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Title</th>
          <th className="text-right py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Action</th>
        </tr>
      </thead>
      <tbody>
        {versions.map((version) => {
          const isCurrent = version.version === currentVersion;
          return (
            <tr key={version.id} className="border-b border-border-primary">
              <td className="py-2 text-text-primary">v{version.version}</td>
              <td className="py-2 text-text-secondary">
                {format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}
              </td>
              <td className="py-2 text-text-secondary max-w-xs truncate">{version.title}</td>
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
