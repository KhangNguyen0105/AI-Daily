import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAlerts,
  addAlert,
  removeAlert,
  clearAlerts,
  type PriceAlert,
} from '../../app/lib/alerts';

/**
 * TDD tests for the alerts localStorage utility.
 * Covers: getAlerts, addAlert, removeAlert, clearAlerts.
 * SSR safety: all functions return safe defaults when window is undefined.
 */
const ALERTS_KEY = 'ai-daily-price-alerts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

describe('alerts utility', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {});
  });

  describe('getAlerts', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getAlerts()).toEqual([]);
    });

    it('returns stored alerts', () => {
      const alerts: PriceAlert[] = [
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 5.0, createdAt: '2026-06-15T00:00:00Z' },
      ];
      localStorageMock.setItem(ALERTS_KEY, JSON.stringify(alerts));
      expect(getAlerts()).toEqual(alerts);
    });

    it('returns empty array on parse failure', () => {
      localStorageMock.setItem(ALERTS_KEY, 'invalid-json');
      expect(getAlerts()).toEqual([]);
    });

    it('returns [] when window is undefined (SSR safety)', () => {
      vi.stubGlobal('window', undefined);
      expect(getAlerts()).toEqual([]);
    });
  });

  describe('addAlert', () => {
    it('stores a new alert', () => {
      const alert: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 1,
        thresholdPrice: 5.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      addAlert(alert);
      expect(getAlerts()).toEqual([alert]);
    });

    it('prevents duplicate alerts (same modelName + sourceId)', () => {
      const alert: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 1,
        thresholdPrice: 5.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      addAlert(alert);
      addAlert({ ...alert, thresholdPrice: 10.0 }); // same modelName + sourceId
      const stored = getAlerts();
      expect(stored).toHaveLength(1);
      expect(stored[0].thresholdPrice).toBe(5.0); // original kept
    });

    it('allows alerts for same model with different sourceId', () => {
      const alert1: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 1,
        thresholdPrice: 5.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      const alert2: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 2,
        thresholdPrice: 10.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      addAlert(alert1);
      addAlert(alert2);
      expect(getAlerts()).toHaveLength(2);
    });

    it('allows alerts for different models with same sourceId', () => {
      const alert1: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 1,
        thresholdPrice: 5.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      const alert2: PriceAlert = {
        modelName: 'claude-sonnet-4-5',
        sourceId: 1,
        thresholdPrice: 10.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      addAlert(alert1);
      addAlert(alert2);
      expect(getAlerts()).toHaveLength(2);
    });

    it('does nothing when window is undefined (SSR safety)', () => {
      vi.stubGlobal('window', undefined);
      const alert: PriceAlert = {
        modelName: 'gpt-4o',
        sourceId: 1,
        thresholdPrice: 5.0,
        createdAt: '2026-06-15T00:00:00Z',
      };
      addAlert(alert);
      // Should not throw and localStorage should not be called
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeAlert', () => {
    it('removes a specific alert by modelName + sourceId', () => {
      const alerts: PriceAlert[] = [
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 5.0, createdAt: '2026-06-15T00:00:00Z' },
        { modelName: 'claude-sonnet-4-5', sourceId: 2, thresholdPrice: 10.0, createdAt: '2026-06-15T00:00:00Z' },
      ];
      localStorageMock.setItem(ALERTS_KEY, JSON.stringify(alerts));

      removeAlert('gpt-4o', 1);
      const remaining = getAlerts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].modelName).toBe('claude-sonnet-4-5');
    });

    it('does nothing when alert not found', () => {
      const alerts: PriceAlert[] = [
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 5.0, createdAt: '2026-06-15T00:00:00Z' },
      ];
      localStorageMock.setItem(ALERTS_KEY, JSON.stringify(alerts));

      removeAlert('nonexistent', 999);
      expect(getAlerts()).toHaveLength(1);
    });

    it('does nothing when window is undefined (SSR safety)', () => {
      vi.stubGlobal('window', undefined);
      removeAlert('gpt-4o', 1);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAlerts', () => {
    it('removes all alerts', () => {
      const alerts: PriceAlert[] = [
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 5.0, createdAt: '2026-06-15T00:00:00Z' },
        { modelName: 'claude-sonnet-4-5', sourceId: 2, thresholdPrice: 10.0, createdAt: '2026-06-15T00:00:00Z' },
      ];
      localStorageMock.setItem(ALERTS_KEY, JSON.stringify(alerts));

      clearAlerts();
      expect(getAlerts()).toEqual([]);
    });

    it('does nothing when window is undefined (SSR safety)', () => {
      vi.stubGlobal('window', undefined);
      clearAlerts();
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });
});
