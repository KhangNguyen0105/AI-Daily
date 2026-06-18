'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

export interface HistoryPoint {
  collectedAt: Date;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
}

export function PriceHistoryChart({ data }: { data: HistoryPoint[] }) {
  const chartData = data
    .filter(
      (point) => point.inputPricePer1m !== null || point.outputPricePer1m !== null
    )
    .map((point) => ({
      date: format(point.collectedAt, 'MMM d'),
      input: point.inputPricePer1m,
      output: point.outputPricePer1m,
    }));

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No pricing data available yet.
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="text-center py-8 text-text-secondary">
        Only 1 data point collected. Price history chart will appear after the next collection.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="input"
          name="Input $/1M"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="output"
          name="Output $/1M"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
