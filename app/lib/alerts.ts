/**
 * Price alerts localStorage utility.
 * Per D-14: localStorage storage — no backend needed. Alerts are per-device.
 * Per D-17: Below threshold only — alert when price drops below threshold.
 * Per D-18: Alert structure: { modelName, sourceId, thresholdPrice, createdAt }
 */

const ALERTS_KEY = 'ai-daily-price-alerts';

export interface PriceAlert {
  modelName: string;
  sourceId: number;
  thresholdPrice: number;
  createdAt: string;
}

/**
 * Get all saved price alerts from localStorage.
 * Returns [] on server (typeof window === 'undefined') for SSR safety.
 */
export function getAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ALERTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PriceAlert[];
  } catch {
    return [];
  }
}

/**
 * Add a price alert to localStorage.
 * Prevents duplicate alerts (same modelName + sourceId).
 */
export function addAlert(alert: PriceAlert): void {
  if (typeof window === 'undefined') return;

  const alerts = getAlerts();
  const isDuplicate = alerts.some(
    (a) => a.modelName === alert.modelName && a.sourceId === alert.sourceId
  );

  if (isDuplicate) return;

  alerts.push(alert);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Remove a specific price alert by modelName + sourceId.
 */
export function removeAlert(modelName: string, sourceId: number): void {
  if (typeof window === 'undefined') return;

  const alerts = getAlerts().filter(
    (a) => !(a.modelName === modelName && a.sourceId === sourceId)
  );
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Clear all price alerts from localStorage.
 */
export function clearAlerts(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ALERTS_KEY);
}
