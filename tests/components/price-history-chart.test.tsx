// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceHistoryChart } from '../../app/components/PriceHistoryChart';

describe('PriceHistoryChart', () => {
  it('renders empty state when fewer than 2 data points', () => {
    render(
      <PriceHistoryChart
        data={[
          {
            collectedAt: new Date('2026-06-01'),
            inputPricePer1m: 2.5,
            outputPricePer1m: 10,
          },
        ]}
      />
    );

    expect(
      screen.getByText('Price history will appear after multiple data collections.')
    ).toBeDefined();
  });

  it('renders empty state for empty data array', () => {
    render(<PriceHistoryChart data={[]} />);

    expect(
      screen.getByText('Price history will appear after multiple data collections.')
    ).toBeDefined();
  });

  it('renders chart when 2+ data points exist', () => {
    render(
      <PriceHistoryChart
        data={[
          {
            collectedAt: new Date('2026-06-01'),
            inputPricePer1m: 2.5,
            outputPricePer1m: 10,
          },
          {
            collectedAt: new Date('2026-06-02'),
            inputPricePer1m: 3.0,
            outputPricePer1m: 12,
          },
        ]}
      />
    );

    // Recharts renders SVG when chart is present
    expect(screen.getByText('Price history will appear after multiple data collections.')).toBeNull();
    // Check that the chart container exists (Recharts renders an SVG)
    const svgElement = document.querySelector('svg');
    expect(svgElement).not.toBeNull();
  });

  it('filters out data points with null prices', () => {
    // 3 points but one has null prices — should show empty state (only 2 valid)
    render(
      <PriceHistoryChart
        data={[
          {
            collectedAt: new Date('2026-06-01'),
            inputPricePer1m: 2.5,
            outputPricePer1m: 10,
          },
          {
            collectedAt: new Date('2026-06-02'),
            inputPricePer1m: null,
            outputPricePer1m: null,
          },
          {
            collectedAt: new Date('2026-06-03'),
            inputPricePer1m: 3.0,
            outputPricePer1m: 12,
          },
        ]}
      />
    );

    // Should still render chart since 2 valid points remain
    const svgElement = document.querySelector('svg');
    expect(svgElement).not.toBeNull();
  });
});
