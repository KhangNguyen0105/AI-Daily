'use client';

import { useState } from 'react';
import { addAlert, removeAlert, getAlerts } from '@/app/lib/alerts';
import { formatPrice } from '@/app/lib/pricing-utils';

/**
 * Slugify a string for use as an HTML ID.
 * Replaces non-alphanumeric characters with hyphens and lowercases.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Inline form for setting a price alert threshold.
 * Per D-15, D-17, D-18: Threshold input + Set/Remove buttons.
 * Per UI-SPEC: Inline confirmation for remove action.
 */
export function AlertSetForm({
  modelName,
  sourceId,
  currentPrice,
  hasAlert,
  onAlertChange,
}: {
  modelName: string;
  sourceId: number;
  currentPrice: number | null;
  hasAlert: boolean;
  onAlertChange: (hasAlert: boolean) => void;
}) {
  const [thresholdInput, setThresholdInput] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [error, setError] = useState('');

  // Get existing alert threshold for display
  const existingAlert = getAlerts().find(
    (a) => a.modelName === modelName && a.sourceId === sourceId,
  );

  const handleSetAlert = () => {
    const value = parseFloat(thresholdInput);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }
    setError('');
    addAlert({
      modelName,
      sourceId,
      thresholdPrice: value,
      createdAt: new Date().toISOString(),
    });

    // Set cookie so layout.tsx knows to check alerts
    document.cookie = 'has_alerts=1; path=/; max-age=31536000';

    onAlertChange(true);
    setThresholdInput('');
  };

  const handleRemoveAlert = () => {
    removeAlert(modelName, sourceId);

    // Check if any alerts remain
    const remaining = getAlerts();
    if (remaining.length === 0) {
      document.cookie =
        'has_alerts=; path=/; max-age=0';
    }

    onAlertChange(false);
    setShowRemoveConfirm(false);
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 w-full max-w-xs">
      {/* Current price reference */}
      {currentPrice !== null && (
        <p className="text-xs text-gray-500 mb-2">
          Current price: {formatPrice(currentPrice)}/1M tokens
        </p>
      )}

      {!hasAlert ? (
        <>
          {/* Set alert form */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label
                htmlFor={`threshold-${slugify(modelName)}-${sourceId}`}
                className="block text-xs text-gray-600 mb-1"
              >
                Input price per 1M tokens
              </label>
              <input
                id={`threshold-${slugify(modelName)}-${sourceId}`}
                type="number"
                value={thresholdInput}
                onChange={(e) => {
                  setThresholdInput(e.target.value);
                  setError('');
                }}
                placeholder="e.g. 1.50"
                min="0"
                step="0.01"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSetAlert}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Set Alert
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </>
      ) : (
        <>
          {/* Remove alert */}
          {existingAlert && (
            <p className="text-xs text-gray-600 mb-2">
              Alert set: notify when price drops below{' '}
              <span className="font-medium">
                {formatPrice(existingAlert.thresholdPrice)}/1M
              </span>
            </p>
          )}
          {!showRemoveConfirm ? (
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Remove Alert
            </button>
          ) : (
            <div>
              <p className="text-xs text-gray-700 mb-2">
                Remove alert for {modelName}? You will no longer be notified
                when the price drops below{' '}
                {existingAlert
                  ? formatPrice(existingAlert.thresholdPrice)
                  : 'your threshold'}
                .
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRemoveAlert}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
