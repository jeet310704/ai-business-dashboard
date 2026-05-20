import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ForecastSummaryCards } from "@/components/forecast/forecast-summary-cards";
import { PredictedCustomersChart } from "@/components/forecast/predicted-customers-chart";
import { ProjectedExpenseChart } from "@/components/forecast/projected-expense-chart";
import { ProjectedRevenueChart } from "@/components/forecast/projected-revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  forecastSummaries,
  predictedCustomerData,
  projectedExpenseData,
  projectedRevenueData,
} from "@/lib/mock-data";

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

  const [salesRecords, expenseRecords] = await Promise.all([
    supabase.from("sales_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("expense_records").select("id").eq("business_id", business.id).limit(1),
  ]);

  const hasData = [salesRecords, expenseRecords].some(
    (records) => Array.isArray(records) && records.length > 0
  );

  if (!hasData) {
    return (
      <DashboardShell title="Forecast">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No forecast available yet</CardTitle>
              <CardDescription>
                Forecasting will appear after enough sales or expense records are uploaded.
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

  return (
    <DashboardShell title="Forecast">
      <div className="space-y-6">
        <ForecastSummaryCards summaries={forecastSummaries} />

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Projected Revenue"
            description="Actual vs projected revenue (next 3 months)"
          >
            <ProjectedRevenueChart data={projectedRevenueData} />
          </ChartCard>
          <ChartCard
            title="Projected Expenses"
            description="Actual vs projected operating expenses"
          >
            <ProjectedExpenseChart data={projectedExpenseData} />
          </ChartCard>
        </section>

        <ChartCard
          title="Predicted Customer Growth"
          description="Customer base forecast based on current trends"
        >
          <PredictedCustomersChart data={predictedCustomerData} />
        </ChartCard>
      </div>
    </DashboardShell>
  );
}
