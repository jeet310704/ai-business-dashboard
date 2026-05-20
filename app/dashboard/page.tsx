import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CustomerGrowthChart } from "@/components/dashboard/customer-growth-chart";
import { InventorySummary } from "@/components/dashboard/inventory-summary";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthlySummarySection } from "@/components/dashboard/monthly-summary";
import { ProfitLossChart } from "@/components/dashboard/profit-loss-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  customerGrowthChartData,
  inventoryItems,
  kpiMetrics,
  monthlySummaries,
  profitLossChartData,
  revenueChartData,
} from "@/lib/mock-data";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: salesRecords } = await supabase
    .from("sales_records")
    .select("id")
    .eq("business_id", business?.id)
    .limit(1);

  const hasSalesRecords = Array.isArray(salesRecords) && salesRecords.length > 0;

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Overview</p>
            <h2 className="text-xl font-semibold text-white">
              Business performance snapshot
            </h2>
          </div>

          <LogoutButton />
        </div>

        {!hasSalesRecords ? (
          <section>
            <Card className="border-border/70 bg-zinc-950 p-8 shadow-xl shadow-black/20">
              <CardHeader className="space-y-4 px-0 pb-0">
                <CardTitle>No business data uploaded yet</CardTitle>
                <CardDescription>
                  Charts and AI insights will appear after you upload your first sales dataset. Start by adding CSV or Excel sales records for your business.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-6 flex flex-col gap-4 px-0">
                <p className="text-sm text-zinc-400">
                  Your current dashboard is waiting for real business data. Upload sales records to unlock analytics, forecasts, and insights.
                </p>
                <Link
                  href="/uploads"
                  className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Upload sales data
                </Link>
              </CardContent>
            </Card>
          </section>
        ) : (
          <>
            <section>
              <h2 className="sr-only">Key metrics</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpiMetrics.map((metric) => (
                  <KpiCard key={metric.id} metric={metric} />
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Revenue"
                description="Monthly revenue over the past 12 months"
              >
                <RevenueChart data={revenueChartData} />
              </ChartCard>

              <ChartCard
                title="Profit & Loss"
                description="Monthly profit vs loss trends"
              >
                <ProfitLossChart data={profitLossChartData} />
              </ChartCard>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Customer Growth"
                description="Total and new customers per month"
              >
                <CustomerGrowthChart data={customerGrowthChartData} />
              </ChartCard>

              <InventorySummary items={inventoryItems} />
            </section>

            <section>
              <MonthlySummarySection summaries={monthlySummaries} />
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}