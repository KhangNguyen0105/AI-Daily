'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAlerts } from '@/app/lib/alerts';
import { formatPrice } from '@/app/lib/pricing-utils';

interface TriggeredAlert {
  modelName: string;
  thresholdPrice: number;
  currentPrice: number;
}

/**
 * On-page toast/banner for triggered price alerts.
 * Per D-16: Check on page load, show banner if any triggered.
 * Per D-17: Only show when price drops below threshold.
 * Per UI-SPEC: Fixed bottom-4 right-4 z-50, auto-dismiss 10s.
 */
export function AlertBanner({
  currentPrices,
}: {
  currentPrices?: Record<string, number>;
}) {
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  // Check alerts on mount (D-16: "check on page load")
  useEffect(() => {
    if (!currentPrices) return;

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
    }
  }, [currentPrices]);

  // Track both timeout IDs to clear on cleanup (CR-03)
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared helper to start fade-out then hide (CR-03)
  const startFadeOut = useCallback((onComplete?: () => void) => {
    // Clear any existing timers
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setFading(true);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setFading(false);
      onComplete?.();
    }, 300); // fade duration
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible) return;

    fadeOutTimerRef.current = setTimeout(() => {
      startFadeOut();
    }, 10_000);

    return () => {
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [visible, startFadeOut]);

  const dismissAlert = useCallback((index: number) => {
    setTriggeredAlerts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        startFadeOut();
      }
      return next;
    });
  }, [startFadeOut]);

  const dismissAll = useCallback(() => {
    startFadeOut(() => setTriggeredAlerts([]));
  }, [startFadeOut]);

  if (!visible || triggeredAlerts.length === 0) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm transition-opacity duration-300 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="space-y-2">
        {triggeredAlerts.map((alert, index) => (
          <div
            key={`${alert.modelName}-${index}`}
            className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-green-900">
                <span aria-hidden="true">&#x1f514;</span>{' '}
                <span className="font-medium">{alert.modelName}</span>:{' '}
                price is {formatPrice(alert.currentPrice)}/1M tokens
                (your threshold: {formatPrice(alert.thresholdPrice)}/1M)
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissAlert(index)}
              className="shrink-0 text-green-600 hover:text-green-800 p-1"
              aria-label={`Dismiss alert for ${alert.modelName}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {triggeredAlerts.length > 1 && (
        <button
          type="button"
          onClick={dismissAll}
          className="mt-2 w-full text-xs text-green-700 hover:text-green-900 text-center py-1"
        >
          Dismiss all
        </button>
      )}
    </div>
  );
}
