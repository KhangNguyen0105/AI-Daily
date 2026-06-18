import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAlerts, addAlert, removeAlert, clearAlerts, PriceAlert } from '../../app/lib/alerts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
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
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {}); // Ensure window is defined
  });

  const mockAlert: PriceAlert = {
    modelName: 'gpt-4o',
    sourceId: 1,
    thresholdPrice: 5.0,
    createdAt: '2026-06-15T00:00:00.000Z',
  };

  describe('getAlerts', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(getAlerts()).toEqual([]);
    });

    it('returns parsed alerts from localStorage', () => {
      localStorageMock.setItem('ai-daily-price-alerts', JSON.stringify([mockAlert]));
      expect(getAlerts()).toEqual([mockAlert]);
    });

    it('returns empty array when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined);
      expect(getAlerts()).toEqual([]);
    });

    it('returns empty array when JSON parse fails', () => {
      localStorageMock.setItem('ai-daily-price-alerts', 'invalid-json');
      expect(getAlerts()).toEqual([]);
    });
  });

  describe('addAlert', () => {
    it('stores alert in localStorage', () => {
      addAlert(mockAlert);
      expect(getAlerts()).toEqual([mockAlert]);
    });

    it('prevents duplicate alerts with same modelName + sourceId', () => {
      addAlert(mockAlert);
      addAlert({ ...mockAlert, thresholdPrice: 10.0 });
      expect(getAlerts()).toHaveLength(1);
      expect(getAlerts()[0].thresholdPrice).toBe(5.0); // Original stays
    });

    it('allows alerts with same modelName but different sourceId', () => {
      addAlert(mockAlert);
      addAlert({ ...mockAlert, sourceId: 2 });
      expect(getAlerts()).toHaveLength(2);
    });

    it('allows alerts with different modelName but same sourceId', () => {
      addAlert(mockAlert);
      addAlert({ ...mockAlert, modelName: 'claude-sonnet-4-5' });
      expect(getAlerts()).toHaveLength(2);
    });

    it('does nothing when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined);
      addAlert(mockAlert);
      // Should not throw, and localStorage should not be called
    });
  });

  describe('removeAlert', () => {
    it('removes specific alert by modelName + sourceId', () => {
      addAlert(mockAlert);
      addAlert({ ...mockAlert, modelName: 'claude-sonnet-4-5', sourceId: 2 });

      removeAlert('gpt-4o', 1);
      const remaining = getAlerts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].modelName).toBe('claude-sonnet-4-5');
    });

    it('does nothing when alert not found', () => {
      addAlert(mockAlert);
      removeAlert('nonexistent', 999);
      expect(getAlerts()).toHaveLength(1);
    });

    it('does nothing when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined);
      removeAlert('gpt-4o', 1);
      // Should not throw
    });
  });

  describe('clearAlerts', () => {
    it('removes all alerts from localStorage', () => {
      addAlert(mockAlert);
      addAlert({ ...mockAlert, modelName: 'claude-sonnet-4-5', sourceId: 2 });

      clearAlerts();
      expect(getAlerts()).toEqual([]);
    });

    it('does nothing when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined);
      clearAlerts();
      // Should not throw
    });
  });
});
