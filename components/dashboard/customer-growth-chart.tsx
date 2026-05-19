"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { formatNumber } from "@/lib/utils";

interface CustomerGrowthChartProps {
  data: ChartDataPoint[];
}

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.015 260)" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "oklch(0.65 0.02 260)", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.16 0.012 260)",
            border: "1px solid oklch(0.26 0.015 260)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === "customers" ? "Total Customers" : "New Customers",
          ]}
        />
        <Line
          type="monotone"
          dataKey="customers"
          stroke="oklch(0.72 0.14 250)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="newCustomers"
          stroke="oklch(0.75 0.12 180)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
