"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import {
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartMargin,
  chartTooltipStyle,
} from "@/lib/chart-config";
import { formatNumber } from "@/lib/utils";

interface PredictedCustomersChartProps {
  data: ChartDataPoint[];
}

export function PredictedCustomersChart({ data }: PredictedCustomersChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={chartMargin}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="name" {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === "actual" ? "Actual" : "Projected",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="projected"
          stroke={chartColors.success}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
