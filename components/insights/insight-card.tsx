import type { ElementType } from "react";
import {
  AlertTriangle,
  DollarSign,
  Package,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import type { Insight, InsightCategory, InsightPriority } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: Insight;
}

const categoryIcons: Record<InsightCategory, ElementType> = {
  revenue: TrendingDown,
  expense: DollarSign,
  inventory: Package,
  customer: Users,
  anomaly: AlertTriangle,
};

const categoryColors: Record<InsightCategory, string> = {
  revenue: "text-primary bg-primary/10",
  expense: "text-amber-400 bg-amber-500/10",
  inventory: "text-orange-400 bg-orange-500/10",
  customer: "text-emerald-400 bg-emerald-500/10",
  anomaly: "text-red-400 bg-red-500/10",
};

const priorityVariants: Record<InsightPriority, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function InsightCard({ insight }: InsightCardProps) {
  const Icon = categoryIcons[insight.category];
  const colorClass = categoryColors[insight.category];

  return (
    <Card className="border-border/60 transition-colors hover:border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colorClass)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={priorityVariants[insight.priority]} className="capitalize">
                  {insight.priority}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI Insight
                </span>
              </div>
              <CardTitle className="text-base leading-snug">{insight.title}</CardTitle>
            </div>
          </div>
          {insight.metric && (
            <span
              className={cn(
                "shrink-0 text-sm font-semibold",
                insight.change && insight.change < 0 ? "text-red-400" : "text-emerald-400"
              )}
            >
              {insight.metric}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">{insight.description}</CardDescription>
        <p className="mt-3 text-xs text-muted-foreground">{insight.createdAt}</p>
      </CardContent>
    </Card>
  );
}
