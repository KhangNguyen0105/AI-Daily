'use client';

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface RunFullPipelineTriggerProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function RunFullPipelineTrigger({ onSuccess, onError }: RunFullPipelineTriggerProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/pipeline/run-full', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed');
      }

      onSuccess(data.message ?? `Full pipeline run started. Check the pipeline page for progress.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to start full pipeline run. Check the pipeline status and try again.');
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isLoading}
        className="px-4 py-2 bg-accent-purple text-white text-sm rounded-md hover:bg-accent-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Run Full Pipeline
      </button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Run Full Pipeline"
        message="This will start a full pipeline run, crawling all providers and generating a new digest. Continue?"
        confirmLabel="Yes, Run Pipeline"
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
        variant="danger"
      />
    </>
  );
}
