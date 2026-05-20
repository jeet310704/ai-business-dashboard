import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InsightCard } from "@/components/insights/insight-card";
import { RecommendationsList } from "@/components/insights/recommendations-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { insights, recommendations } from "@/lib/mock-data";

export default async function InsightsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <DashboardShell title="Insights">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Complete onboarding first</CardTitle>
              <CardDescription>
                Create your business record before insights can be generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/onboarding"
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Start onboarding
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const [salesRecords, expenseRecords, inventoryRecords, customerRecords] = await Promise.all([
    supabase.from("sales_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("expense_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("inventory_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("customer_records").select("id").eq("business_id", business.id).limit(1),
  ]);

  const hasData = [salesRecords, expenseRecords, inventoryRecords, customerRecords].some(
    (records) => Array.isArray(records) && records.length > 0
  );

  if (!hasData) {
    return (
      <DashboardShell title="Insights">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No insights yet</CardTitle>
              <CardDescription>
                Upload sales, expense, inventory, or customer data to generate AI-powered business insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/uploads"
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Upload business data
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

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
