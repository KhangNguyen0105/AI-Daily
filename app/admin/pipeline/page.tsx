'use client';

import { useState, useEffect } from 'react';
import { PipelineRunsTable } from '@/app/components/admin/PipelineRunsTable';
import { ErrorLogTable } from '@/app/components/admin/ErrorLogTable';
import { ReCrawlTrigger } from '@/app/components/admin/ReCrawlTrigger';
import { RegenerateTrigger } from '@/app/components/admin/RegenerateTrigger';
import { AutoPublishToggle } from '@/app/components/admin/AutoPublishToggle';
import { useToast, ToastContainer } from '@/app/components/admin/Toast';

interface PipelineRun {
  id: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  stats: Record<string, unknown> | null;
}

interface Source {
  name: string;
}

export default function PipelinePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [errors, setErrors] = useState<PipelineRun[]>([]);
  const [providers, setProviders] = useState<Source[]>([]);
  const [autoPublish, setAutoPublish] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [runsRes, errorsRes, sourcesRes, settingsRes] = await Promise.all([
          fetch('/api/admin/pipeline/runs'),
          fetch('/api/admin/pipeline/errors'),
          fetch('/api/admin/sources'),
          fetch('/api/admin/settings'),
        ]);

        if (runsRes.ok) {
          const data = await runsRes.json();
          setRuns(data.runs ?? []);
        }

        if (errorsRes.ok) {
          const data = await errorsRes.json();
          setErrors(data.errors ?? []);
        }

        if (sourcesRes.ok) {
          const data = await sourcesRes.json();
          const uniqueProviders = Array.from(
            new Set((data.sources ?? []).map((s: { name: string }) => s.name))
          ).map((name) => ({ name: name as string }));
          setProviders(uniqueProviders);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setAutoPublish(data.settings?.auto_publish === 'true');
        }
      } catch {
        addToast('error', 'Could not load pipeline data. The pipeline monitor could not retrieve run history. Refresh the page or check the pipeline logs.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAutoPublishChange = async (enabled: boolean) => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'auto_publish', value: enabled ? 'true' : 'false' }),
    });

    if (!res.ok) throw new Error('Failed to update');

    addToast('success', `Auto-publish ${enabled ? 'enabled' : 'disabled'}.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading pipeline data...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pipeline Monitor</h1>

      {/* Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <ReCrawlTrigger
            providers={providers}
            onSuccess={(msg) => addToast('success', msg)}
            onError={(msg) => addToast('error', msg)}
          />
          <RegenerateTrigger
            onSuccess={(msg) => addToast('success', msg)}
            onError={(msg) => addToast('error', msg)}
          />
          <AutoPublishToggle
            initialValue={autoPublish}
            onChange={handleAutoPublishChange}
          />
        </div>
      </div>

      {/* Pipeline Runs */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Pipeline Runs</h2>
        <PipelineRunsTable runs={runs as Array<{ id: number; status: string; startedAt: string; completedAt: string | null; stats: { totalProviders?: number; succeeded?: number; failed?: number; extractions?: number; verifiedCount?: number; likelyCount?: number; lowConfidenceCount?: number; attempted?: number } | null }>} />
      </div>

      {/* Recent Errors */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Errors</h2>
        <ErrorLogTable errors={errors as Array<{ id: number; startedAt: string; stats: { failed?: number; errorDetails?: Array<{ provider: string; error: string }> } | null }>} />
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
