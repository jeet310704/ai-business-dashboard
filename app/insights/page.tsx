import { requireUser } from "@/lib/auth";
import { InsightCard } from "@/components/insights/insight-card";
import { RecommendationsList } from "@/components/insights/recommendations-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { insights, recommendations } from "@/lib/mock-data";

export default async function InsightsPage() {
  await requireUser();
  const highPriority = insights.filter((i) => i.priority === "high");
  const otherInsights = insights.filter((i) => i.priority !== "high");

  return (
    <DashboardShell title="Insights">
      <article className="space-y-8">
        {highPriority.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">Anomaly alerts</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {highPriority.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">AI insights</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {otherInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </section>

        <RecommendationsList recommendations={recommendations} />
      </article>
    </DashboardShell>
  );
}
