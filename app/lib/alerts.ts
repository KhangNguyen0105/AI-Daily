/**
 * localStorage CRUD utility for price alerts.
 * Per D-14: localStorage storage -- no backend needed. Alerts are per-device.
 * Per D-17: Below threshold only -- alert when price drops below threshold.
 * Per D-18: Alert structure: { modelName, sourceId, thresholdPrice, createdAt }.
 *
 * All functions guard with typeof window === 'undefined' for SSR safety (Pitfall 2).
 */

const ALERTS_KEY = 'ai-daily-price-alerts';

export interface PriceAlert {
  modelName: string;
  sourceId: number;
  thresholdPrice: number;
  createdAt: string;
}

/**
 * Read all alerts from localStorage.
 * Returns [] when localStorage is empty, parse fails, or window is undefined (SSR).
 */
export function getAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add a new price alert.
 * Prevents duplicate alerts (same modelName + sourceId).
 * No-op when window is undefined (SSR).
 */
export function addAlert(alert: PriceAlert): void {
  if (typeof window === 'undefined') return;
  const alerts = getAlerts();
  const exists = alerts.some(
    (a) => a.modelName === alert.modelName && a.sourceId === alert.sourceId,
  );
  if (exists) return;
  alerts.push(alert);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Remove a specific alert by modelName + sourceId.
 * No-op when window is undefined (SSR).
 */
export function removeAlert(modelName: string, sourceId: number): void {
  if (typeof window === 'undefined') return;
  const alerts = getAlerts().filter(
    (a) => !(a.modelName === modelName && a.sourceId === sourceId),
  );
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Remove all alerts from localStorage.
 * No-op when window is undefined (SSR).
 */
export function clearAlerts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ALERTS_KEY);
}
