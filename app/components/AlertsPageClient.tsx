'use client';

import { useState, useEffect } from 'react';
import {
  getAlerts,
  removeAlert,
  clearAlerts,
  type PriceAlert,
} from '@/app/lib/alerts';
import { formatPrice } from '@/app/lib/pricing-utils';

/**
 * Client component for the /alerts page.
 * Reads alerts from localStorage on mount (hydration-safe).
 * Per UI-SPEC: max-w-6xl mx-auto px-4 py-8 layout.
 * Per UI-SPEC: empty states, destructive action confirmations.
 */
export function AlertsPageClient() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [mounted, setMounted] = useState(false);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [removeConfirmKey, setRemoveConfirmKey] = useState<string | null>(null);

  // Read from localStorage on mount to avoid SSR hydration mismatch (Pitfall 2)
  useEffect(() => {
    setAlerts(getAlerts());
    setMounted(true);
  }, []);

  function handleRemove(modelName: string, sourceId: number) {
    removeAlert(modelName, sourceId);
    setAlerts(getAlerts());
    setRemoveConfirmKey(null);
  }

  function handleClearAll() {
    clearAlerts();
    setAlerts([]);
    setClearConfirmVisible(false);
  }

  function alertKey(alert: PriceAlert): string {
    return `${alert.modelName}-${alert.sourceId}`;
  }

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Price Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get notified when model prices drop below your threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Price Alerts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Get notified when model prices drop below your threshold.
      </p>

      {alerts.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No alerts set</p>
          <p className="mt-2 text-sm text-gray-500">
            Visit any model page and click the bell icon to set a price alert.
          </p>
        </div>
      ) : (
        <>
          {/* Alert count + Clear All */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
            </p>
            {!clearConfirmVisible ? (
              <button
                type="button"
                onClick={() => setClearConfirmVisible(true)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Remove all {alerts.length} price alerts? This cannot be undone.
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirmVisible(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Alert list */}
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => {
              const key = alertKey(alert);
              const isRemoving = removeConfirmKey === key;

              return (
                <div
                  key={key}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {alert.modelName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Threshold: {formatPrice(alert.thresholdPrice)} per 1M tokens
                      </p>
                    </div>
                    {!isRemoving ? (
                      <button
                        type="button"
                        onClick={() => setRemoveConfirmKey(key)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          Remove alert for {alert.modelName}? You will no longer be
                          notified when the price drops below{' '}
                          {formatPrice(alert.thresholdPrice)}.
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemove(alert.modelName, alert.sourceId)
                          }
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoveConfirmKey(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
