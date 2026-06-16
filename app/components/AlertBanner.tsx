'use client';

import { useState, useEffect } from 'react';
import { getAlerts, type PriceAlert } from '@/app/lib/alerts';

interface TriggeredAlert {
  modelName: string;
  thresholdPrice: number;
  currentPrice: number;
}

/**
 * On-page toast/banner for triggered alerts.
 * Per D-16: check alerts on page load, show if any triggered.
 * Per D-17: below threshold only.
 * Fixed position bottom-right, auto-dismiss 10s.
 */
export function AlertBanner({
  currentPrices = {},
}: {
  currentPrices?: Record<string, number>;
}) {
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alerts = getAlerts();
    const triggered: TriggeredAlert[] = [];

    for (const alert of alerts) {
      const key = `${alert.modelName}:${alert.sourceId}`;
      const currentPrice = currentPrices[key];

      if (currentPrice !== undefined && currentPrice < alert.thresholdPrice) {
        triggered.push({
          modelName: alert.modelName,
          thresholdPrice: alert.thresholdPrice,
          currentPrice,
        });
      }
    }

    if (triggered.length > 0) {
      setTriggeredAlerts(triggered);
      setVisible(true);

      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => setVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [currentPrices]);

  const handleDismiss = (index: number) => {
    setTriggeredAlerts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDismissAll = () => {
    setVisible(false);
  };

  if (!visible || triggeredAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {triggeredAlerts.map((alert, index) => (
        <div
          key={`${alert.modelName}-${index}`}
          className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-start justify-between gap-3"
        >
          <div>
            <p className="text-sm font-medium text-green-900">
              🔔 {alert.modelName}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Price is ${alert.currentPrice.toFixed(4)}/1M tokens (your threshold: ${alert.thresholdPrice.toFixed(4)}/1M)
            </p>
          </div>
          <button
            onClick={() => handleDismiss(index)}
            className="text-green-600 hover:text-green-800 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}

      {triggeredAlerts.length > 1 && (
        <button
          onClick={handleDismissAll}
          className="w-full text-xs text-gray-600 hover:text-gray-800 text-center py-1"
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}
