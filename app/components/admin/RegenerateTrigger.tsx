'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ConfirmDialog } from './ConfirmDialog';

interface RegenerateTriggerProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function RegenerateTrigger({ onSuccess, onError }: RegenerateTriggerProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/pipeline/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });

      // IN-02 fix: Read body once before status check
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed');
      }

      onSuccess(data.message ?? `Article regeneration queued for ${selectedDate}. Check the pipeline page for progress.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Regeneration failed to queue. Check the pipeline status and try again.');
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={() => setIsConfirmOpen(true)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Regenerate Article
        </button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Regenerate Article"
        message={`This will regenerate the article for ${selectedDate}. The current version will be saved in history. Continue?`}
        confirmLabel="Yes, Regenerate"
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
        variant="danger"
      />
    </>
  );
}
