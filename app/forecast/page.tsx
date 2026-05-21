import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ForecastSummaryCards } from "@/components/forecast/forecast-summary-cards";
import { ProjectedExpenseChart } from "@/components/forecast/projected-expense-chart";
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

  const [{ data: salesRecords }, { data: expenseRecords }] = await Promise.all([
    supabase
      .from("sales_records")
      .select("revenue, sale_date")
      .eq("business_id", business.id),
    supabase
      .from("expense_records")
      .select("amount, expense_date")
      .eq("business_id", business.id),
  ]);

  const sales = Array.isArray(salesRecords) ? salesRecords : [];
  const expenses = Array.isArray(expenseRecords) ? expenseRecords : [];

  if (sales.length === 0 && expenses.length === 0) {
    return (
      <DashboardShell title="Forecast">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No forecast available yet</CardTitle>
              <CardDescription>
                Forecasting will appear after your sales or expense data is uploaded.
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

  const monthlyRevenue = new Map<string, number>();
  let totalRevenue = 0;
  for (const record of sales) {
    const revenue = Number(record.revenue ?? 0);
    totalRevenue += revenue;
    if (!record.sale_date) continue;
    const date = new Date(record.sale_date);
    if (Number.isNaN(date.getTime())) continue;

    const monthKey = formatMonthKey(date);
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + revenue);
  }

  const monthlyExpenses = new Map<string, number>();
  let totalExpenses = 0;
  for (const record of expenses) {
    const amount = Number(record.amount ?? 0);
    totalExpenses += amount;
    if (!record.expense_date) continue;
    const date = new Date(record.expense_date);
    if (Number.isNaN(date.getTime())) continue;

    const monthKey = formatMonthKey(date);
    monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) ?? 0) + amount);
  }

  const allMonthKeys = Array.from(new Set([...monthlyRevenue.keys(), ...monthlyExpenses.keys()])).sort();
  const averageMonthlyRevenue = totalRevenue / Math.max(allMonthKeys.length, 1);
  const averageMonthlyExpenses = totalExpenses / Math.max(allMonthKeys.length, 1);
  const averageMonthlyProfit = (totalRevenue - totalExpenses) / Math.max(allMonthKeys.length, 1);

  const revenueData = allMonthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    actual: monthlyRevenue.get(monthKey) ?? 0,
    projected: 0,
  }));

  const expenseData = allMonthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    actual: monthlyExpenses.get(monthKey) ?? 0,
    projected: 0,
  }));

  const profitData = allMonthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    actual: (monthlyRevenue.get(monthKey) ?? 0) - (monthlyExpenses.get(monthKey) ?? 0),
    projected: averageMonthlyProfit,
  }));

  const nextMonthKey = (() => {
    if (!allMonthKeys.length) return null;
    const [year, month] = allMonthKeys[allMonthKeys.length - 1].split("-");
    return formatMonthKey(new Date(Number(year), Number(month), 1));
  })();

  if (nextMonthKey) {
    revenueData.push({ name: formatMonthLabel(nextMonthKey), actual: 0, projected: averageMonthlyRevenue });
    expenseData.push({ name: formatMonthLabel(nextMonthKey), actual: 0, projected: averageMonthlyExpenses });
    profitData.push({ name: formatMonthLabel(nextMonthKey), actual: 0, projected: averageMonthlyProfit });
  }

  const summaries = [
    {
      id: "average-monthly-revenue",
      label: "Average monthly revenue",
      value: formatCurrency(averageMonthlyRevenue),
      change: 0,
      period: "Based on uploads",
    },
    {
      id: "average-monthly-expenses",
      label: "Average monthly expenses",
      value: formatCurrency(averageMonthlyExpenses),
      change: 0,
      period: "Based on uploads",
    },
    {
      id: "average-monthly-profit",
      label: "Average monthly profit",
      value: formatCurrency(averageMonthlyProfit),
      change: 0,
      period: "Based on uploads",
    },
    {
      id: "next-month-profit",
      label: "Next month profit projection",
      value: formatCurrency(averageMonthlyProfit),
      change: 0,
      period: "Simple forecast",
    },
  ];

  return (
    <DashboardShell title="Forecast">
      <div className="space-y-6">
        <ForecastSummaryCards summaries={summaries} />

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Projected Revenue"
            description="Actual monthly revenue with a simple next-month projection"
          >
            <ProjectedRevenueChart data={revenueData} />
          </ChartCard>
          <ChartCard
            title="Projected Profit"
            description="Profit after expenses, based on uploaded revenue and expense data"
          >
            <ProjectedRevenueChart data={profitData} />
          </ChartCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Projected Expenses"
            description="Actual monthly expenses with a simple next-month projection"
          >
            <ProjectedExpenseChart data={expenseData} />
          </ChartCard>
          <Card className="border-border/60 bg-muted/20">
            <CardHeader>
              <CardTitle>Forecast overview</CardTitle>
              <CardDescription>
                This forecast is computed from uploaded revenue and expense records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your next-month projections are based on historical averages from your uploaded business data.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}
