import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReportCard } from "@/components/reports/report-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <DashboardShell title="Reports">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Complete onboarding first</CardTitle>
              <CardDescription>
                Create your business record before reports can be generated.
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
      <DashboardShell title="Reports">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No reports generated yet</CardTitle>
              <CardDescription>
                Reports will be generated after your sales data is uploaded.
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

  let totalRevenue = 0;
  const categories = new Set<string>();
  const products = new Set<string>();

  for (const record of records) {
    totalRevenue += Number(record.revenue ?? 0);
    if (record.category?.trim()) {
      categories.add(record.category.trim());
    }
    if (record.product_name?.trim()) {
      products.add(record.product_name.trim());
    }
  }

  const reportCards = [
    {
      id: "sales-summary",
      title: "Sales Summary Report",
      description: `A revenue summary based on ${records.length} uploaded sales records.`,
      type: "sales" as const,
      status: "scheduled" as const,
      period: "Latest sales data",
    },
    {
      id: "category-report",
      title: "Revenue by Category Report",
      description: `Category-level revenue performance for ${formatNumber(categories.size)} categories.`,
      type: "sales" as const,
      status: "scheduled" as const,
      period: "Latest sales data",
    },
    {
      id: "product-performance",
      title: "Product Performance Report",
      description: `Top product revenue insights from your uploaded sales records.`,
      type: "sales" as const,
      status: "scheduled" as const,
      period: "Latest sales data",
    },
  ];

  return (
    <DashboardShell title="Reports">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sales records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(records.length)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(categories.size)}</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Generated reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base">Analytics summary</CardTitle>
            <CardDescription>
              Reports are built from your uploaded sales records and can be exported when ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review sales trends, category performance, and product results based on your real data. Upload more records to keep these reports up to date.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
