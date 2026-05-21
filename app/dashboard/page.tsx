import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ChartCard } from "@/components/dashboard/chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChartDataPoint, KpiMetric } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

type SalesRecord = {
  id: string;
  product_name: string | null;
  category: string | null;
  quantity: number | null;
  revenue: number | null;
  sale_date: string | null;
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const index = Number(month) - 1;
  return `${monthNames[index]} ${year}`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const salesRecordsQuery = business
    ? await supabase
        .from("sales_records")
        .select("id, product_name, category, quantity, revenue, sale_date")
        .eq("business_id", business.id)
    : null;

  const salesRecords = Array.isArray(salesRecordsQuery?.data)
    ? (salesRecordsQuery.data as SalesRecord[])
    : [];
  const hasSalesRecords = salesRecords.length > 0;

  const totalRevenue = salesRecords.reduce(
    (sum, record) => sum + Number(record.revenue ?? 0),
    0
  );

  const totalQuantity = salesRecords.reduce(
    (sum, record) => sum + Number(record.quantity ?? 0),
    0
  );

  const totalProducts = new Set(
    salesRecords
      .map((record) => record.product_name?.trim() ?? "")
      .filter(Boolean)
  ).size;

  const totalCategories = new Set(
    salesRecords
      .map((record) => record.category?.trim() ?? "")
      .filter(Boolean)
  ).size;

  const monthlyMap = new Map<
    string,
    {
      revenue: number;
      quantity: number;
      products: Set<string>;
      categories: Set<string>;
    }
  >();

  for (const record of salesRecords) {
    const date = record.sale_date ? new Date(record.sale_date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    const monthKey = formatMonthKey(date);
    const month = monthlyMap.get(monthKey) ?? {
      revenue: 0,
      quantity: 0,
      products: new Set<string>(),
      categories: new Set<string>(),
    };

    month.revenue += Number(record.revenue ?? 0);
    month.quantity += Number(record.quantity ?? 0);
    if (record.product_name?.trim()) {
      month.products.add(record.product_name.trim());
    }
    if (record.category?.trim()) {
      month.categories.add(record.category.trim());
    }

    monthlyMap.set(monthKey, month);
  }

  const monthKeys = Array.from(monthlyMap.keys()).sort();
  const revenueChartData: ChartDataPoint[] = monthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    revenue: monthlyMap.get(monthKey)?.revenue ?? 0,
  }));

  const currentRevenue = Number(
    revenueChartData.length > 0 ? revenueChartData[revenueChartData.length - 1].revenue : 0
  );
  const previousRevenue = Number(
    revenueChartData.length > 1 ? revenueChartData[revenueChartData.length - 2].revenue : currentRevenue
  );
  const revenueChange = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const currentQuantity = Number(
    monthKeys.length > 0 ? monthlyMap.get(monthKeys[monthKeys.length - 1])?.quantity ?? 0 : 0
  );
  const previousQuantity = Number(
    monthKeys.length > 1 ? monthlyMap.get(monthKeys[monthKeys.length - 2])?.quantity ?? currentQuantity : currentQuantity
  );
  const quantityChange = previousQuantity ? ((currentQuantity - previousQuantity) / previousQuantity) * 100 : 0;

  const kpiMetrics: KpiMetric[] = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: revenueChange,
      changeLabel: "vs last month",
      trend: revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "neutral",
    },
    {
      id: "quantity",
      label: "Total Quantity Sold",
      value: formatNumber(totalQuantity),
      change: quantityChange,
      changeLabel: "vs last month",
      trend: quantityChange > 0 ? "up" : quantityChange < 0 ? "down" : "neutral",
    },
    {
      id: "products",
      label: "Total Products Sold",
      value: formatNumber(totalProducts),
      change: 0,
      changeLabel: "since launch",
      trend: "neutral",
    },
    {
      id: "categories",
      label: "Total Categories",
      value: formatNumber(totalCategories),
      change: 0,
      changeLabel: "since launch",
      trend: "neutral",
    },
  ];

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
                description="Monthly sales revenue grouped by month"
              >
                <RevenueChart data={revenueChartData} />
              </ChartCard>

              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Expanded analytics coming soon</CardTitle>
                  <CardDescription>
                    Profit, customer, and inventory insights will arrive once those uploads are supported.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Current dashboard analytics are based on uploaded sales records only.
                  </p>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}