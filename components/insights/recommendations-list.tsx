import { ArrowRight, Lightbulb } from "lucide-react";
import type { Recommendation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecommendationsListProps {
  recommendations: Recommendation[];
}

const impactVariants = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <CardTitle>Optimization Recommendations</CardTitle>
        </div>
        <CardDescription>AI-suggested actions to improve business performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <article
            key={rec.id}
            className="group flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 p-4 transition-colors hover:border-border hover:bg-muted/30"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <span className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{rec.title}</h4>
                <Badge variant={impactVariants[rec.impact]} className="capitalize">
                  {rec.impact} impact
                </Badge>
              </span>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
              )}
              aria-label={`View recommendation: ${rec.title}`}
            >
              Details
              <ArrowRight className="h-3 w-3" />
            </button>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
