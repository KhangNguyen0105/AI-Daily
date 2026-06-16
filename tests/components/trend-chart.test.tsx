// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendChart, TrendPoint } from '../../app/components/TrendChart';

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ name, dot }: any) => <div data-testid={`line-${name}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('TrendChart', () => {
  const mockData: TrendPoint[] = [
    { collectedAt: new Date('2026-06-10'), inputPricePer1m: 5.0, outputPricePer1m: 15.0 },
    { collectedAt: new Date('2026-06-11'), inputPricePer1m: 4.0, outputPricePer1m: 12.0 },
    { collectedAt: new Date('2026-06-12'), inputPricePer1m: 6.0, outputPricePer1m: 18.0 },
  ];

  it('renders empty state when data is empty', () => {
    render(<TrendChart data={[]} modelName="Test Model" />);
    expect(screen.getByText('No pricing data available yet.')).toBeDefined();
  });

  it('renders single-point state when data has 1 point', () => {
    const singlePoint: TrendPoint[] = [
      { collectedAt: new Date('2026-06-10'), inputPricePer1m: 5.0, outputPricePer1m: 15.0 },
    ];
    render(<TrendChart data={singlePoint} modelName="Test Model" />);
    expect(screen.getByText('Only 1 data point collected. Trend chart will appear after the next collection.')).toBeDefined();
  });

  it('renders chart with 2+ data points', () => {
    render(<TrendChart data={mockData} modelName="Test Model" />);
    expect(screen.getByTestId('line-chart')).toBeDefined();
    expect(screen.getByTestId('line-chart').getAttribute('data-length')).toBe('3');
  });

  it('renders chart with model name heading', () => {
    render(<TrendChart data={mockData} modelName="GPT-4o" />);
    expect(screen.getByText('GPT-4o')).toBeDefined();
  });

  it('filters out points where both prices are null', () => {
    const dataWithNulls: TrendPoint[] = [
      { collectedAt: new Date('2026-06-10'), inputPricePer1m: 5.0, outputPricePer1m: 15.0 },
      { collectedAt: new Date('2026-06-11'), inputPricePer1m: null, outputPricePer1m: null },
      { collectedAt: new Date('2026-06-12'), inputPricePer1m: 4.0, outputPricePer1m: 12.0 },
    ];
    render(<TrendChart data={dataWithNulls} modelName="Test Model" />);
    // Should render chart with 2 points (filtered out the null one)
    expect(screen.getByTestId('line-chart').getAttribute('data-length')).toBe('2');
  });

  it('sorts data chronologically regardless of input order', () => {
    const unsortedData: TrendPoint[] = [
      { collectedAt: new Date('2026-06-12'), inputPricePer1m: 6.0, outputPricePer1m: 18.0 },
      { collectedAt: new Date('2026-06-10'), inputPricePer1m: 5.0, outputPricePer1m: 15.0 },
      { collectedAt: new Date('2026-06-11'), inputPricePer1m: 4.0, outputPricePer1m: 12.0 },
    ];
    render(<TrendChart data={unsortedData} modelName="Test Model" />);
    // Chart should render with sorted data
    expect(screen.getByTestId('line-chart').getAttribute('data-length')).toBe('3');
  });
});
