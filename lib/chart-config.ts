export const chartColors = {
  primary: "oklch(0.72 0.14 250)",
  success: "oklch(0.72 0.16 155)",
  warning: "oklch(0.75 0.14 75)",
  destructive: "oklch(0.62 0.2 25)",
  muted: "oklch(0.65 0.02 260)",
  grid: "oklch(0.26 0.015 260)",
  tooltipBg: "oklch(0.16 0.012 260)",
  tooltipBorder: "oklch(0.26 0.015 260)",
} as const;

export const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: chartColors.muted, fontSize: 12 },
} as const;

export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: chartColors.grid,
  vertical: false,
} as const;

export const chartTooltipStyle = {
  background: chartColors.tooltipBg,
  border: `1px solid ${chartColors.tooltipBorder}`,
  borderRadius: "8px",
  fontSize: "12px",
} as const;

export const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 } as const;

export function formatAxisCurrency(v: number): string {
  return `$${(v / 1000).toFixed(0)}k`;
}
