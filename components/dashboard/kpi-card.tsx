import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { KpiMetric } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";

interface KpiCardProps {
  metric: KpiMetric;
}

export function KpiCard({ metric }: KpiCardProps) {
  const TrendIcon =
    metric.trend === "up" ? ArrowUpRight : metric.trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5",
              metric.trend === "up" && "text-emerald-400",
              metric.trend === "down" && "text-red-400",
              metric.trend === "neutral" && "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "font-medium",
              metric.trend === "up" && "text-emerald-400",
              metric.trend === "down" && "text-red-400",
              metric.trend === "neutral" && "text-muted-foreground"
            )}
          >
            {formatPercent(metric.change)}
          </span>
          <span className="text-muted-foreground">{metric.changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
