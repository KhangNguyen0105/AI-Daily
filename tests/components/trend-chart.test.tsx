// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendChart } from '../../app/components/TrendChart';
import type { TrendPoint } from '../../app/components/TrendChart';

describe('TrendChart', () => {
  it('renders empty state when data is empty', () => {
    render(<TrendChart data={[]} modelName="gpt-4o" />);

    expect(
      screen.getByText('No pricing data available yet.')
    ).toBeDefined();
  });

  it('renders single-point state when data has 1 point', () => {
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-01'),
        inputPricePer1m: 2.5,
        outputPricePer1m: 10,
      },
    ];
    render(<TrendChart data={data} modelName="gpt-4o" />);

    expect(
      screen.getByText('Only 1 data point collected. Trend chart will appear after the next collection.')
    ).toBeDefined();
  });

  it('renders chart with 2+ data points', () => {
    const data: TrendPoint[] = [
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
    ];
    const { container } = render(<TrendChart data={data} modelName="gpt-4o" />);

    // Should NOT show empty state
    expect(screen.queryByText('No pricing data available yet.')).toBeNull();
    expect(screen.queryByText(/Only 1 data point collected/)).toBeNull();
    // Recharts ResponsiveContainer renders with the recharts-responsive-container class
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });

  it('renders chart with reverse-chronological input data (sorted ascending)', () => {
    // Pass data in reverse chronological order — chart should still render
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-03'),
        inputPricePer1m: 3.5,
        outputPricePer1m: 14,
      },
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
    ];
    const { container } = render(<TrendChart data={data} modelName="gpt-4o" />);

    // Chart should render successfully regardless of input order
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
    // Should not show empty states
    expect(screen.queryByText('No pricing data available yet.')).toBeNull();
    expect(screen.queryByText(/Only 1 data point collected/)).toBeNull();
  });

  it('renders chart with price changes (drop + increase)', () => {
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-01'),
        inputPricePer1m: 2.5,
        outputPricePer1m: 10,
      },
      {
        collectedAt: new Date('2026-06-02'),
        inputPricePer1m: 2.0, // price drop
        outputPricePer1m: 12, // price increase
      },
    ];
    const { container } = render(<TrendChart data={data} modelName="gpt-4o" />);

    // Chart should render with price change data
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });

  it('renders chart with unchanged prices', () => {
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-01'),
        inputPricePer1m: 2.5,
        outputPricePer1m: 10,
      },
      {
        collectedAt: new Date('2026-06-02'),
        inputPricePer1m: 2.5, // no change
        outputPricePer1m: 10, // no change
      },
    ];
    const { container } = render(<TrendChart data={data} modelName="gpt-4o" />);

    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });

  it('filters out data points where both prices are null', () => {
    const data: TrendPoint[] = [
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
    ];
    const { container } = render(<TrendChart data={data} modelName="gpt-4o" />);

    // Should still render chart since 2 valid points remain
    const chartContainer = container.querySelector('.recharts-responsive-container');
    expect(chartContainer).not.toBeNull();
  });

  it('shows empty state when all data points have null prices', () => {
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-01'),
        inputPricePer1m: null,
        outputPricePer1m: null,
      },
      {
        collectedAt: new Date('2026-06-02'),
        inputPricePer1m: null,
        outputPricePer1m: null,
      },
    ];
    render(<TrendChart data={data} modelName="gpt-4o" />);

    expect(
      screen.getByText('No pricing data available yet.')
    ).toBeDefined();
  });

  it('renders model name heading', () => {
    const data: TrendPoint[] = [
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
    ];
    render(<TrendChart data={data} modelName="gpt-4o" />);

    expect(screen.getByText('gpt-4o')).toBeDefined();
  });

  it('renders only single valid point as single-point state', () => {
    // 3 data points but only 1 has valid prices
    const data: TrendPoint[] = [
      {
        collectedAt: new Date('2026-06-01'),
        inputPricePer1m: null,
        outputPricePer1m: null,
      },
      {
        collectedAt: new Date('2026-06-02'),
        inputPricePer1m: 2.5,
        outputPricePer1m: 10,
      },
      {
        collectedAt: new Date('2026-06-03'),
        inputPricePer1m: null,
        outputPricePer1m: null,
      },
    ];
    render(<TrendChart data={data} modelName="gpt-4o" />);

    expect(
      screen.getByText('Only 1 data point collected. Trend chart will appear after the next collection.')
    ).toBeDefined();
  });
});
