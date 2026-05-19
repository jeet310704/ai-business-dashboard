import { ArrowUpRight } from "lucide-react";
import type { ForecastSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

interface ForecastSummaryCardsProps {
  summaries: ForecastSummary[];
}

export function ForecastSummaryCards({ summaries }: ForecastSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaries.map((summary) => (
        <Card key={summary.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {summary.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{summary.value}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-emerald-400">{formatPercent(summary.change)}</span>
              <span className="text-muted-foreground">{summary.period}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
