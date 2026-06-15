// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AlertBanner } from '../../app/components/AlertBanner';

const ALERTS_KEY = 'ai-daily-price-alerts';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('AlertBanner', () => {
  it('renders nothing when no alerts in localStorage', () => {
    const { container } = render(
      <AlertBanner currentPrices={{ 'gpt-4o:1': 2.5 }} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no currentPrices provided', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const { container } = render(<AlertBanner />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when alert exists but price is above threshold', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 2, // threshold is 2
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const { container } = render(
      <AlertBanner currentPrices={{ 'gpt-4o:1': 2.5 }} />, // current price 2.5 > threshold 2
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders alert when current price is below threshold', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    render(<AlertBanner currentPrices={{ 'gpt-4o:1': 2.5 }} />);

    expect(screen.getByText(/gpt-4o/)).not.toBeNull();
    expect(screen.getByText(/\$2\.50/)).not.toBeNull();
    expect(screen.getByText(/\$5\.00/)).not.toBeNull();
  });

  it('renders multiple triggered alerts', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
        {
          modelName: 'claude-sonnet-4-5',
          sourceId: 2,
          thresholdPrice: 10,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    render(
      <AlertBanner
        currentPrices={{ 'gpt-4o:1': 2.5, 'claude-sonnet-4-5:2': 3 }}
      />,
    );

    expect(screen.getByText(/gpt-4o/)).not.toBeNull();
    expect(screen.getByText(/claude-sonnet-4-5/)).not.toBeNull();
    expect(screen.getByText('Dismiss all')).not.toBeNull();
  });

  it('dismiss button removes individual alert', async () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
        {
          modelName: 'claude-sonnet-4-5',
          sourceId: 2,
          thresholdPrice: 10,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    render(
      <AlertBanner
        currentPrices={{ 'gpt-4o:1': 2.5, 'claude-sonnet-4-5:2': 3 }}
      />,
    );

    // Click dismiss on the first alert
    const dismissButtons = screen.getAllByLabelText(/Dismiss alert for/);
    expect(dismissButtons.length).toBe(2);

    act(() => {
      dismissButtons[0].click();
    });

    // After dismissing, only one alert should remain visible
    // (the other one is removed, and since we have fewer than 2, no "Dismiss all")
    expect(screen.queryByText('Dismiss all')).toBeNull();
  });

  it('auto-dismisses after 10 seconds', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const { container } = render(
      <AlertBanner currentPrices={{ 'gpt-4o:1': 2.5 }} />,
    );

    // Alert should be visible
    expect(screen.getByText(/gpt-4o/)).not.toBeNull();

    // Advance past 10s auto-dismiss + 300ms fade
    act(() => {
      vi.advanceTimersByTime(10_300);
    });

    // Alert should be gone
    expect(container.innerHTML).toBe('');
  });

  it('does not show alert for model not in currentPrices', () => {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify([
        {
          modelName: 'gpt-4o',
          sourceId: 1,
          thresholdPrice: 5,
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const { container } = render(
      <AlertBanner currentPrices={{ 'other-model:1': 1 }} />,
    );

    // Alert for gpt-4o should not show because gpt-4o:1 is not in currentPrices
    expect(container.innerHTML).toBe('');
  });
});
