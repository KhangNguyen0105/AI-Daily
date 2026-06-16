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

interface ChartDataPoint {
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
 * Custom dot component for input price line.
 * Green for drops, red for increases, blue default.
 * Defined outside render function per Pitfall 1.
 */
function InputDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  let fill = '#3b82f6'; // blue-500 default
  let r = 4;

  if (payload.isFirstPoint) {
    // Star for first point - handled by separate component
    return null;
  } else if (payload.isInputDrop) {
    fill = '#16a34a'; // green-600
    r = 6;
  } else if (payload.isInputIncrease) {
    fill = '#dc2626'; // red-600
    r = 6;
  }

  return <circle cx={cx} cy={cy} r={r} fill={fill} />;
}

/**
 * Custom dot component for output price line.
 * Green for drops, red for increases, red default.
 * Defined outside render function per Pitfall 1.
 */
function OutputDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload || cx === undefined || cy === undefined) return null;

  let fill = '#ef4444'; // red-500 default
  let r = 4;

  if (payload.isFirstPoint) {
    // Star for first point - handled by separate component
    return null;
  } else if (payload.isOutputDrop) {
    fill = '#16a34a'; // green-600
    r = 6;
  } else if (payload.isOutputIncrease) {
    fill = '#dc2626'; // red-600
    r = 6;
  }

  return <circle cx={cx} cy={cy} r={r} fill={fill} />;
}

/**
 * Custom active dot for hover state.
 */
function ActiveDot(props: any) {
  const { cx, cy } = props;
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={6} fill="#2563eb" stroke="#fff" strokeWidth={2} />;
}

/**
 * Star marker for first data point (new model launch).
 * Per D-04: New model launches get a star icon in amber (#f59e0b).
 */
function FirstPointStar(props: any) {
  const { cx, cy, payload } = props;
  if (!payload || !payload.isFirstPoint || cx === undefined || cy === undefined) {
    return null;
  }

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <polygon
        points="0,-8 2.5,-3 8,-3 3.5,1.5 5.5,7 0,4 -5.5,7 -3.5,1.5 -8,-3 -2.5,-3"
        fill="#f59e0b"
        stroke="#f59e0b"
        strokeWidth={1}
      />
    </g>
  );
}

export function TrendChart({ data, modelName }: { data: TrendPoint[]; modelName: string }) {
  // Filter points where at least one price is non-null
  const filteredData = data.filter(
    (point) => point.inputPricePer1m !== null || point.outputPricePer1m !== null
  );

  // Sort chronologically by collectedAt ascending (Pitfall 5: Recharts expects oldest-first)
  const sortedData = [...filteredData].sort(
    (a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
  );

  // Build chart data with flags for visual markers
  const chartData: ChartDataPoint[] = sortedData.map((point, index) => {
    const prevPoint = index > 0 ? sortedData[index - 1] : null;

    let isInputDrop = false;
    let isInputIncrease = false;
    let isOutputDrop = false;
    let isOutputIncrease = false;

    if (prevPoint) {
      // Compare input prices
      if (
        point.inputPricePer1m !== null &&
        prevPoint.inputPricePer1m !== null &&
        point.inputPricePer1m < prevPoint.inputPricePer1m
      ) {
        isInputDrop = true;
      } else if (
        point.inputPricePer1m !== null &&
        prevPoint.inputPricePer1m !== null &&
        point.inputPricePer1m > prevPoint.inputPricePer1m
      ) {
        isInputIncrease = true;
      }

      // Compare output prices
      if (
        point.outputPricePer1m !== null &&
        prevPoint.outputPricePer1m !== null &&
        point.outputPricePer1m < prevPoint.outputPricePer1m
      ) {
        isOutputDrop = true;
      } else if (
        point.outputPricePer1m !== null &&
        prevPoint.outputPricePer1m !== null &&
        point.outputPricePer1m > prevPoint.outputPricePer1m
      ) {
        isOutputIncrease = true;
      }
    }

    return {
      date: format(new Date(point.collectedAt), 'MMM d'),
      input: point.inputPricePer1m,
      output: point.outputPricePer1m,
      isInputDrop,
      isInputIncrease,
      isOutputDrop,
      isOutputIncrease,
      isFirstPoint: index === 0,
    };
  });

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
        Only 1 data point collected. Trend chart will appear after the next collection.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{modelName}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${value.toFixed(4)}`,
              name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="input"
            name="Input $/1M"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<InputDot />}
            activeDot={<ActiveDot />}
          />
          <Line
            type="monotone"
            dataKey="output"
            name="Output $/1M"
            stroke="#ef4444"
            strokeWidth={2}
            dot={<OutputDot />}
            activeDot={<ActiveDot />}
          />
          {/* Star markers for first point - rendered as separate Line with custom shape */}
          <Line
            type="monotone"
            dataKey="input"
            name=""
            stroke="transparent"
            dot={<FirstPointStar />}
            activeDot={false}
            legendType="none"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
