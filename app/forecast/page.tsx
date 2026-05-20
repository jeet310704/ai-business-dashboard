import { requireUser } from "@/lib/auth";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ForecastSummaryCards } from "@/components/forecast/forecast-summary-cards";
import { PredictedCustomersChart } from "@/components/forecast/predicted-customers-chart";
import { ProjectedExpenseChart } from "@/components/forecast/projected-expense-chart";
import { ProjectedRevenueChart } from "@/components/forecast/projected-revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  forecastSummaries,
  predictedCustomerData,
  projectedExpenseData,
  projectedRevenueData,
} from "@/lib/mock-data";

export default async function ForecastPage() {
  await requireUser();

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
