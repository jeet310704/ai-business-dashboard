import { ChartCard } from "@/components/dashboard/chart-card";
import { CustomerGrowthChart } from "@/components/dashboard/customer-growth-chart";
import { InventorySummary } from "@/components/dashboard/inventory-summary";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthlySummarySection } from "@/components/dashboard/monthly-summary";
import { ProfitLossChart } from "@/components/dashboard/profit-loss-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  customerGrowthChartData,
  inventoryItems,
  kpiMetrics,
  monthlySummaries,
  profitLossChartData,
  revenueChartData,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        <section>
          <h2 className="sr-only">Key metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiMetrics.map((metric) => (
              <KpiCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Revenue" description="Monthly revenue over the past 12 months">
            <RevenueChart data={revenueChartData} />
          </ChartCard>
          <ChartCard title="Profit & Loss" description="Monthly profit vs loss trends">
            <ProfitLossChart data={profitLossChartData} />
          </ChartCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Customer Growth" description="Total and new customers per month">
            <CustomerGrowthChart data={customerGrowthChartData} />
          </ChartCard>
          <InventorySummary items={inventoryItems} />
        </section>

        <section>
          <MonthlySummarySection summaries={monthlySummaries} />
        </section>
      </div>
    </DashboardShell>
  );
}
