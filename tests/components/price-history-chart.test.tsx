// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
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
      screen.getByText('Only 1 data point collected. Price history chart will appear after the next collection.')
    ).toBeDefined();
  });

  it('renders empty state for empty data array', () => {
    render(<PriceHistoryChart data={[]} />);

    expect(
      screen.getByText('No pricing data available yet.')
    ).toBeDefined();
  });

  it('renders chart when 2+ data points exist', () => {
    const { container } = render(
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

    // Should NOT show empty state
    expect(screen.queryByText('No pricing data available yet.')).toBeNull();
    expect(screen.queryByText('Only 1 data point collected. Price history chart will appear after the next collection.')).toBeNull();
    // Recharts ResponsiveContainer renders with the recharts-responsive-container class
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });

  it('filters out data points with null prices', () => {
    // 3 points but one has null prices — should still show chart (2 valid)
    const { container } = render(
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
    expect(screen.queryByText('Price history will appear after multiple data collections.')).toBeNull();
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });
});
