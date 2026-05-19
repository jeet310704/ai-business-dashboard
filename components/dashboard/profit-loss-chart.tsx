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
import { formatCurrency } from "@/lib/utils";

interface ProfitLossChartProps {
  data: ChartDataPoint[];
}

export function ProfitLossChart({ data }: ProfitLossChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.16 0.012 260)",
            border: "1px solid oklch(0.26 0.015 260)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === "profit" ? "Profit" : "Loss",
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          formatter={(value) => (value === "profit" ? "Profit" : "Loss")}
        />
        <Bar dataKey="profit" fill="oklch(0.72 0.16 155)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="loss" fill="oklch(0.62 0.2 25)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
