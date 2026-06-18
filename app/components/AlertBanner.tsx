'use client';

import { useState, useEffect } from 'react';
import { getAlerts } from '@/app/lib/alerts';

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
 *
 * Fetches its own current prices from /api/prices so it works
 * without a parent server component passing data down.
 */
export function AlertBanner() {
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    async function checkAlerts() {
      const alerts = getAlerts();
      if (alerts.length === 0) return;

      try {
        const res = await fetch('/api/prices');
        if (!res.ok) return;
        const currentPrices: Record<string, number> = await res.json();
        if (cancelled) return;

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
          dismissTimer = setTimeout(() => {
            if (!cancelled) setVisible(false);
          }, 10000);
        }
      } catch {
        // Silently fail — alerts are non-critical UI
      }
    }

    checkAlerts();
    return () => {
      cancelled = true;
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

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
          className="bg-badge-green-bg border border-badge-green-border rounded-lg p-4 shadow-lg flex items-start justify-between gap-3"
        >
          <div>
            <p className="text-sm font-medium text-badge-green-text">
              🔔 {alert.modelName}
            </p>
            <p className="text-xs text-badge-green-text/80 mt-1">
              Price is ${alert.currentPrice.toFixed(4)}/1M tokens (your threshold: ${alert.thresholdPrice.toFixed(4)}/1M)
            </p>
          </div>
          <button
            onClick={() => handleDismiss(index)}
            className="text-badge-green-text hover:opacity-80 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}

      {triggeredAlerts.length > 1 && (
        <button
          onClick={handleDismissAll}
          className="w-full text-xs text-text-secondary hover:text-text-primary text-center py-1"
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}
