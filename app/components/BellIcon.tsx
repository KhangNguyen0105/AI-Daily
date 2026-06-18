'use client';

import { useState, useEffect, useRef } from 'react';
import { getAlerts, addAlert, removeAlert } from '@/app/lib/alerts';

/**
 * Interactive bell icon for setting price alerts.
 * Per D-15: Bell icon on model detail page.
 * Gray outline when no alert, blue filled when alert exists.
 */
export function BellIcon({
  modelName,
  sourceId,
  currentPrice,
}: {
  modelName: string;
  sourceId: number;
  currentPrice: number | null;
}) {
  const [hasAlert, setHasAlert] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowForm(false);
      }
    }
    if (showForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showForm]);

  // Check if alert exists on mount
  useEffect(() => {
    const alerts = getAlerts();
    setHasAlert(alerts.some((a) => a.modelName === modelName && a.sourceId === sourceId));
  }, [modelName, sourceId]);

  const handleSetAlert = () => {
    const threshold = parseFloat(thresholdInput);
    if (threshold > 0) {
      addAlert({
        modelName,
        sourceId,
        thresholdPrice: threshold,
        createdAt: new Date().toISOString(),
      });
      setHasAlert(true);
      setShowForm(false);
      setThresholdInput('');
    }
  };

  const handleRemoveAlert = () => {
    removeAlert(modelName, sourceId);
    setHasAlert(false);
    setShowForm(false);
  };

  return (
    <div ref={containerRef} className="inline-block">
      <button
        onClick={() => setShowForm(!showForm)}
        aria-expanded={showForm}
        aria-haspopup="true"
        className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
          hasAlert
            ? 'text-accent-blue hover:text-accent-blue/80'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
        title={hasAlert ? 'Manage price alert' : 'Set price alert'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={hasAlert ? 'currentColor' : 'none'}
          stroke="currentColor"
          className="w-6 h-6"
          strokeWidth={2}
        >
          <path d="M14 8a2 2 0 1 0-4 0c0 1.07-.56 2.02-1.39 2.59A5.97 5.97 0 0 0 6 14.5V16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1.5a5.97 5.97 0 0 0-2.61-3.91A2.98 2.98 0 0 1 14 8Z" />
          <path d="M10 18a2 2 0 1 0 4 0" />
        </svg>
      </button>

      {showForm && (
        <div role="dialog" aria-label="Price alert settings" className="absolute mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary shadow-lg z-10 w-64">
          {currentPrice !== null && (
            <p className="text-xs text-text-secondary mb-2">
              Current price: ${currentPrice.toFixed(4)}/1M tokens
            </p>
          )}

          {!hasAlert ? (
            <>
              <input
                type="number"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                placeholder="Threshold price (USD/1M)"
                className="w-full px-2 py-1.5 text-sm border border-border-secondary rounded mb-2"
                min="0"
                step="0.0001"
              />
              <button
                onClick={handleSetAlert}
                className="w-full px-3 py-1.5 text-sm font-medium text-white bg-accent-blue rounded hover:bg-accent-blue/90"
              >
                Set Alert
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary mb-2">
                Alert is active for this model.
              </p>
              <button
                onClick={handleRemoveAlert}
                className="w-full px-3 py-1.5 text-sm font-medium text-white bg-accent-red rounded hover:bg-accent-red/90"
              >
                Remove Alert
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
