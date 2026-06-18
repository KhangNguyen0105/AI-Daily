'use client';

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface ReCrawlTriggerProps {
  providers: Array<{ name: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ReCrawlTrigger({ providers, onSuccess, onError }: ReCrawlTriggerProps) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/pipeline/re-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName: selectedProvider }),
      });

      // IN-02 fix: Read body once before status check
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed');
      }

      onSuccess(data.message ?? `Re-crawl job queued for ${selectedProvider}. Check the pipeline page for progress.`);
      setSelectedProvider('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Re-crawl failed to queue. Check the pipeline status and try again.');
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px] shadow-sm"
        >
          <option value="" disabled>Select provider...</option>
          {providers.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={() => setIsConfirmOpen(true)}
          disabled={!selectedProvider || isLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Re-crawl Provider
        </button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Re-crawl Provider"
        message={`This will queue a new crawl job for ${selectedProvider}. The current data will remain until the crawl completes. Continue?`}
        confirmLabel="Yes, Re-crawl"
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
        variant="danger"
      />
    </>
  );
}
