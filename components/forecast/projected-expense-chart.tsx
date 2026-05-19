"use client";

import {
  Bar,
  BarChart,
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

interface ProjectedExpenseChartProps {
  data: ChartDataPoint[];
}

export function ProjectedExpenseChart({ data }: ProjectedExpenseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={chartMargin}>
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
        <Bar dataKey="actual" fill={chartColors.warning} radius={[4, 4, 0, 0]} />
        <Bar dataKey="projected" fill={chartColors.muted} radius={[4, 4, 0, 0]} opacity={0.6} />
      </BarChart>
    </ResponsiveContainer>
  );
}
