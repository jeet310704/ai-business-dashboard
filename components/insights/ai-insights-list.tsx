import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight } from "@/types";

interface AiInsightsListProps {
  insights: Insight[];
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AiInsightsList({ insights }: AiInsightsListProps) {
  return (
    <div className="grid gap-4">
      {insights.map((insight) => (
        <Card key={insight.id} className="border-border/60 bg-muted/20">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{insight.title}</CardTitle>
                <CardDescription>{insight.description}</CardDescription>
              </div>
              <Badge className="capitalize">{insight.priority}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Generated {formatDate(insight.createdAt)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
