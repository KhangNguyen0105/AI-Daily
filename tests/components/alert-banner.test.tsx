// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AlertBanner } from '../../app/components/AlertBanner';

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

describe('AlertBanner', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {});
  });

  it('renders nothing when no alerts in localStorage', () => {
    const { container } = render(<AlertBanner currentPrices={{}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when alerts exist but no prices triggered', () => {
    localStorageMock.setItem(
      'ai-daily-price-alerts',
      JSON.stringify([
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 5.0, createdAt: '2026-06-15' },
      ])
    );

    const { container } = render(
      <AlertBanner currentPrices={{ 'gpt-4o:1': 10.0 }} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders alert when price is below threshold', () => {
    localStorageMock.setItem(
      'ai-daily-price-alerts',
      JSON.stringify([
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 10.0, createdAt: '2026-06-15' },
      ])
    );

    render(<AlertBanner currentPrices={{ 'gpt-4o:1': 5.0 }} />);
    expect(screen.getByText(/🔔 gpt-4o/)).toBeDefined();
    expect(screen.getByText(/Price is \$5\.0000\/1M tokens/)).toBeDefined();
  });

  it('dismiss button removes alert from view', async () => {
    localStorageMock.setItem(
      'ai-daily-price-alerts',
      JSON.stringify([
        { modelName: 'gpt-4o', sourceId: 1, thresholdPrice: 10.0, createdAt: '2026-06-15' },
      ])
    );

    render(<AlertBanner currentPrices={{ 'gpt-4o:1': 5.0 }} />);

    const dismissButton = screen.getByText('✕');
    await act(async () => {
      dismissButton.click();
    });

    expect(screen.queryByText(/🔔 gpt-4o/)).toBeNull();
  });
});
