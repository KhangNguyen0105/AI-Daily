'use client';

import { useState, useEffect } from 'react';
import { PriceAlert, getAlerts, removeAlert, clearAlerts } from '@/app/lib/alerts';

/**
 * Client component for managing price alerts.
 * Reads from localStorage on mount (hydration-safe).
 * Per UI-SPEC: /alerts page layout, empty states, destructive actions.
 */
export function AlertsPageClient() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [removingAlert, setRemovingAlert] = useState<{ modelName: string; sourceId: number } | null>(null);

  // Read from localStorage on mount (hydration-safe)
  useEffect(() => {
    setAlerts(getAlerts());
  }, []);

  const handleRemove = (modelName: string, sourceId: number) => {
    removeAlert(modelName, sourceId);
    setAlerts(getAlerts());
    setRemovingAlert(null);
  };

  const handleClearAll = () => {
    clearAlerts();
    setAlerts([]);
    setClearConfirmVisible(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Price Alerts</h1>
      <p className="text-sm text-gray-600 mb-8">
        Get notified when model prices drop below your threshold.
      </p>

      {/* Alert count + Clear All */}
      {alerts.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} saved
          </p>
          {!clearConfirmVisible ? (
            <button
              onClick={() => setClearConfirmVisible(true)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Remove all {alerts.length} price alerts? This cannot be undone.
              </span>
              <button
                onClick={handleClearAll}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Confirm
              </button>
              <button
                onClick={() => setClearConfirmVisible(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Alert list or empty state */}
      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-gray-900 mb-2">No alerts set</p>
          <p className="text-sm text-gray-600">
            Visit any model page and click the bell icon to set a price alert.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={`${alert.modelName}-${alert.sourceId}`}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {alert.modelName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Threshold: {formatPrice(alert.thresholdPrice)} per 1M tokens
                  </p>
                </div>

                {removingAlert?.modelName === alert.modelName &&
                removingAlert?.sourceId === alert.sourceId ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">
                      Remove alert for {alert.modelName}? You will no longer be notified when the price drops below {formatPrice(alert.thresholdPrice)}.
                    </span>
                    <button
                      onClick={() => handleRemove(alert.modelName, alert.sourceId)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setRemovingAlert(null)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setRemovingAlert({
                        modelName: alert.modelName,
                        sourceId: alert.sourceId,
                      })
                    }
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
