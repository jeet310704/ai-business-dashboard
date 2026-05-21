import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ForecastSummaryCards } from "@/components/forecast/forecast-summary-cards";
import { ProjectedRevenueChart } from "@/components/forecast/projected-revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const index = Number(month) - 1;
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index]} ${year}`;
}

export default async function ForecastPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <DashboardShell title="Forecast">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Complete onboarding first</CardTitle>
              <CardDescription>
                Create your business record before forecasts can be generated.
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
    .select("revenue, sale_date")
    .eq("business_id", business.id);

  const records = Array.isArray(salesRecords) ? salesRecords : [];

  if (records.length === 0) {
    return (
      <DashboardShell title="Forecast">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No forecast available yet</CardTitle>
              <CardDescription>
                Forecasting will appear after your first sales records are uploaded.
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

  const dailyRevenue = new Map<string, number>();
  const monthlyRevenue = new Map<string, number>();
  let totalRevenue = 0;

  for (const record of records) {
    const revenue = Number(record.revenue ?? 0);
    totalRevenue += revenue;

    if (!record.sale_date) continue;
    const date = new Date(record.sale_date);
    if (Number.isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10);
    const monthKey = formatMonthKey(date);

    dailyRevenue.set(dayKey, (dailyRevenue.get(dayKey) ?? 0) + revenue);
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + revenue);
  }

  const averageDailyRevenue = totalRevenue / Math.max(dailyRevenue.size, 1);
  const averageMonthlyRevenue = totalRevenue / Math.max(monthlyRevenue.size, 1);
  const nextMonthProjection = averageMonthlyRevenue;

  const monthKeys = Array.from(monthlyRevenue.keys()).sort();

  const revenueData = monthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    actual: monthlyRevenue.get(monthKey) ?? 0,
    projected: 0,
  }));

  if (monthKeys.length > 0) {
    const [year, month] = monthKeys[monthKeys.length - 1].split("-");
    const nextMonth = new Date(Number(year), Number(month), 1);
    const nextMonthKey = formatMonthKey(nextMonth);
    revenueData.push({
      name: formatMonthLabel(nextMonthKey),
      actual: 0,
      projected: nextMonthProjection,
    });
  }

  const summaries = [
    {
      id: "average-daily",
      label: "Average daily revenue",
      value: formatCurrency(averageDailyRevenue),
      change: 0,
      period: "Based on uploaded sales",
    },
    {
      id: "average-monthly",
      label: "Average monthly revenue",
      value: formatCurrency(averageMonthlyRevenue),
      change: 0,
      period: "Historic sales average",
    },
    {
      id: "next-month",
      label: "Next month projection",
      value: formatCurrency(nextMonthProjection),
      change: 0,
      period: "Simple average forecast",
    },
  ];

  return (
    <DashboardShell title="Forecast">
      <div className="space-y-6">
        <ForecastSummaryCards summaries={summaries} />

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Basic sales forecast</CardTitle>
            <CardDescription>
              This forecast is computed from uploaded sales data averages. It is a simple projection and not an AI-generated forecast.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use this page to review how your actual monthly sales compare with a simple next-month projection based on your historical revenue.
            </p>
          </CardContent>
        </Card>

        <section>
          <ChartCard
            title="Projected Revenue"
            description="Actual monthly revenue with a basic next-month projection"
          >
            <ProjectedRevenueChart data={revenueData} />
          </ChartCard>
        </section>
      </div>
    </DashboardShell>
  );
}
