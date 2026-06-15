'use client';

import { useState, useEffect } from 'react';
import { SourcesTable } from '@/app/components/admin/SourcesTable';
import { useToast, ToastContainer } from '@/app/components/admin/Toast';

interface Source {
  id: number;
  name: string;
  url: string;
  providerType: string;
  isActive: number;
  updatedAt: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const loadSources = async () => {
      try {
        const res = await fetch('/api/admin/sources');
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources ?? []);
        } else {
          addToast('error', 'Could not load sources. The source list could not be retrieved. Refresh the page or check provider configuration.');
        }
      } catch {
        addToast('error', 'Could not load sources. The source list could not be retrieved. Refresh the page or check provider configuration.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSources();
  }, []);

  const handleToggleTrust = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/sources/${id}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      addToast('success', `Source ${data.name} marked as ${data.isActive ? 'trusted' : 'untrusted'}.`);

      // Refresh sources
      const sourcesRes = await fetch('/api/admin/sources');
      if (sourcesRes.ok) {
        const sourcesData = await sourcesRes.json();
        setSources(sourcesData.sources ?? []);
      }
    } catch {
      addToast('error', 'Failed to update source trust status.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading sources...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Sources{' '}
        <span className="text-base font-normal text-gray-500">({sources.length})</span>
      </h1>

      <SourcesTable sources={sources} onToggleTrust={handleToggleTrust} />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
