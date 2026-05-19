"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
  formatAxisCurrency,
} from "@/lib/chart-config";
import { formatCurrency } from "@/lib/utils";

interface ProjectedRevenueChartProps {
  data: ChartDataPoint[];
}

export function ProjectedRevenueChart({ data }: ProjectedRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={chartMargin}>
        <defs>
          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.2} />
            <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="name" {...chartAxisProps} />
        <YAxis {...chartAxisProps} tickFormatter={formatAxisCurrency} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === "actual" ? "Actual" : "Projected",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        <Area
          type="monotone"
          dataKey="actual"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#actualGradient)"
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="projected"
          stroke={chartColors.success}
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#projectedGradient)"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
