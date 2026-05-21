import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecommendationsList } from "@/components/insights/recommendations-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recommendations } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";

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

  const { data: salesRecords } = await supabase
    .from("sales_records")
    .select("product_name, category, revenue")
    .eq("business_id", business.id);

  const records = Array.isArray(salesRecords) ? salesRecords : [];

  if (records.length === 0) {
    return (
      <DashboardShell title="Insights">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No insights yet</CardTitle>
              <CardDescription>
                Upload sales records to generate insights from your real revenue data.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/uploads"
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Upload sales data
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();
  let totalRevenue = 0;

  for (const record of records) {
    const revenue = Number(record.revenue ?? 0);
    totalRevenue += revenue;

    const product = record.product_name?.trim() || "Unknown product";
    const category = record.category?.trim() || "Other";

    revenueByProduct.set(product, (revenueByProduct.get(product) ?? 0) + revenue);
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + revenue);
  }

  const bestProduct = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topCategory = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  return (
    <DashboardShell title="Insights">
      <article className="space-y-8">
        <section>
          <p className="text-sm text-muted-foreground">Basic sales insights</p>
          <h2 className="text-2xl font-semibold">Insights from your uploaded sales records</h2>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total revenue</CardTitle>
              <CardDescription>From your uploaded sales records</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Best-selling product</CardTitle>
              <CardDescription>By revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{bestProduct}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top category</CardTitle>
              <CardDescription>Most revenue by category</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{topCategory}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sales rows analyzed</CardTitle>
              <CardDescription>Uploaded records used for insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(records.length)}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Basic sales insights</CardTitle>
            <CardDescription>
              These insights are generated directly from your uploaded sales records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Total revenue</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products analyzed</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumber(revenueByProduct.size)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <RecommendationsList recommendations={recommendations} />
      </article>
    </DashboardShell>
  );
}
