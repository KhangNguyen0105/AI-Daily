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

export interface TrendPoint {
  collectedAt: Date;
  inputPricePer1m: number | null;
  outputPricePer1m: number | null;
}

interface ChartPoint {
  date: string;
  input: number | null;
  output: number | null;
  isInputDrop: boolean;
  isInputIncrease: boolean;
  isOutputDrop: boolean;
  isOutputIncrease: boolean;
  isFirstPoint: boolean;
}

/**
 * Build chart data from trend points.
 * Filters out points where both prices are null,
 * sorts chronologically (oldest first), and computes
 * flags for price changes and first point.
 */
function buildChartData(points: TrendPoint[]): ChartPoint[] {
  const sorted = [...points]
    .filter((p) => p.inputPricePer1m !== null || p.outputPricePer1m !== null)
    .sort(
      (a, b) =>
        new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
    );

  return sorted.map((point, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    return {
      date: format(point.collectedAt, 'MMM d'),
      input: point.inputPricePer1m,
      output: point.outputPricePer1m,
      isFirstPoint: i === 0,
      isInputDrop:
        prev?.inputPricePer1m != null &&
        point.inputPricePer1m != null &&
        point.inputPricePer1m < prev.inputPricePer1m,
      isInputIncrease:
        prev?.inputPricePer1m != null &&
        point.inputPricePer1m != null &&
        point.inputPricePer1m > prev.inputPricePer1m,
      isOutputDrop:
        prev?.outputPricePer1m != null &&
        point.outputPricePer1m != null &&
        point.outputPricePer1m < prev.outputPricePer1m,
      isOutputIncrease:
        prev?.outputPricePer1m != null &&
        point.outputPricePer1m != null &&
        point.outputPricePer1m > prev.outputPricePer1m,
    };
  });
}

/**
 * Custom star shape for the first data point.
 * Renders an amber star SVG polygon.
 */
function StarMarker({
  cx,
  cy,
}: {
  cx?: number;
  cy?: number;
}) {
  if (cx === undefined || cy === undefined) return null;
  const size = 8;
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
  return <polygon points={points} fill="#f59e0b" />;
}

/**
 * Custom dot for input price line.
 * Green circle for price drops, red for increases, default blue.
 * Shows amber star for first data point.
 * Defined outside render to avoid Pitfall 1 (re-render performance).
 */
function InputDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  if (payload.isFirstPoint) {
    return <StarMarker cx={cx} cy={cy} />;
  }
  if (payload.isInputDrop) {
    return <circle cx={cx} cy={cy} r={6} fill="#16a34a" />;
  }
  if (payload.isInputIncrease) {
    return <circle cx={cx} cy={cy} r={6} fill="#dc2626" />;
  }
  return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
}

/**
 * Custom dot for output price line.
 * Green circle for price drops, red for increases, default red.
 * Shows amber star for first data point.
 * Defined outside render to avoid Pitfall 1 (re-render performance).
 */
function OutputDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  if (payload.isFirstPoint) {
    return <StarMarker cx={cx} cy={cy} />;
  }
  if (payload.isOutputDrop) {
    return <circle cx={cx} cy={cy} r={6} fill="#16a34a" />;
  }
  if (payload.isOutputIncrease) {
    return <circle cx={cx} cy={cy} r={6} fill="#dc2626" />;
  }
  return <circle cx={cx} cy={cy} r={4} fill="#ef4444" />;
}

/**
 * TrendChart — dual-line Recharts chart for per-model pricing trends.
 * Extends PriceHistoryChart pattern with visual markers:
 * - Green dots for price drops
 * - Red dots for price increases
 * - Amber star for first data point (new model launch)
 *
 * @param data - Array of trend data points
 * @param modelName - Display name for the model
 */
export function TrendChart({
  data,
  modelName,
}: {
  data: TrendPoint[];
  modelName: string;
}) {
  const chartData = buildChartData(data);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No pricing data available yet.
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="text-center py-8 text-gray-500">
        Only 1 data point collected. Trend chart will appear after the next
        collection.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{modelName}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
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
            dot={InputDot}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="output"
            name="Output $/1M"
            stroke="#ef4444"
            strokeWidth={2}
            dot={OutputDot}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
