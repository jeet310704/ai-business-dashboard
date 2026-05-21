import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { ChartCard } from "@/components/dashboard/chart-card";
import { InventorySummary } from "@/components/dashboard/inventory-summary";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ProjectedRevenueChart } from "@/components/forecast/projected-revenue-chart";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChartDataPoint, InventoryItem, KpiMetric } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

type SalesRecord = {
  id: string;
  product_name: string | null;
  category: string | null;
  quantity: number | null;
  revenue: number | null;
  sale_date: string | null;
};

type ExpenseRecord = {
  amount: number | null;
  expense_date: string | null;
};

type InventoryRecord = {
  id: string;
  product_name: string | null;
  category: string | null;
  stock: number | null;
  reorder_level: number | null;
};

type CustomerRecord = {
  id: string;
  customer_name: string | null;
  total_spent: number | null;
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

  const [salesRecordsQuery, expenseRecordsQuery, inventoryRecordsQuery, customerRecordsQuery] =
    business
      ? await Promise.all([
          supabase
            .from("sales_records")
            .select("id, product_name, category, quantity, revenue, sale_date")
            .eq("business_id", business.id),
          supabase
            .from("expense_records")
            .select("amount, expense_date")
            .eq("business_id", business.id),
          supabase
            .from("inventory_records")
            .select("id, product_name, category, stock, reorder_level")
            .eq("business_id", business.id),
          supabase
            .from("customer_records")
            .select("id, customer_name, email, total_spent")
            .eq("business_id", business.id),
        ])
      : [null, null, null, null];

  const salesRecords = Array.isArray(salesRecordsQuery?.data)
    ? (salesRecordsQuery.data as SalesRecord[])
    : [];
  const expenseRecords = Array.isArray(expenseRecordsQuery?.data)
    ? (expenseRecordsQuery.data as ExpenseRecord[])
    : [];
  const inventoryRecords = Array.isArray(inventoryRecordsQuery?.data)
    ? (inventoryRecordsQuery.data as InventoryRecord[])
    : [];
  const customerRecords = Array.isArray(customerRecordsQuery?.data)
    ? (customerRecordsQuery.data as CustomerRecord[])
    : [];
  const hasSalesRecords = salesRecords.length > 0;

  const totalRevenue = salesRecords.reduce(
    (sum, record) => sum + Number(record.revenue ?? 0),
    0
  );

  const totalQuantitySold = salesRecords.reduce(
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

  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();
  const monthlyRevenue = new Map<string, number>();

  for (const record of salesRecords) {
    const revenue = Number(record.revenue ?? 0);
    const product = record.product_name?.trim() || "Unknown product";
    const category = record.category?.trim() || "Other";
    const date = record.sale_date ? new Date(record.sale_date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    revenueByProduct.set(product, (revenueByProduct.get(product) ?? 0) + revenue);
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + revenue);

    const monthKey = formatMonthKey(date);
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + revenue);
  }

  const totalExpenses = expenseRecords.reduce(
    (sum, record) => sum + Number(record.amount ?? 0),
    0
  );

  const monthlyExpenses = new Map<string, number>();
  for (const record of expenseRecords) {
    const amount = Number(record.amount ?? 0);
    const date = record.expense_date ? new Date(record.expense_date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      continue;
    }

    const monthKey = formatMonthKey(date);
    monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) ?? 0) + amount);
  }

  const profit = totalRevenue - totalExpenses;
  const inventoryItemCount = inventoryRecords.length;
  const inventoryItems = inventoryRecords.map((record, index) => {
    const quantity = Number(record.stock ?? 0);
    const reorderLevel = Number(record.reorder_level ?? 0);
    const status = quantity <= 0 ? "out_of_stock" : quantity <= reorderLevel ? "low_stock" : "in_stock";

    return {
      id: record.id ?? `inventory-${index}`,
      name: record.product_name?.trim() || "Unknown product",
      sku: record.category?.trim() || "Unknown",
      quantity,
      status,
      value: 0,
    } as InventoryItem;
  });

  const totalStockCount = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = inventoryItems.filter((item) => item.status === "low_stock").length;
  const reorderRiskCount = inventoryItems.filter((item) => item.status === "out_of_stock" || item.status === "low_stock").length;

  const totalCustomerSpend = customerRecords.reduce(
    (sum, record) => sum + Number(record.total_spent ?? 0),
    0
  );
  const customerCount = customerRecords.length;

  const topSellingProduct = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topRevenueCategory = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const monthlyProfit = new Map<string, number>();
  const allMonthKeys = Array.from(new Set([...monthlyRevenue.keys(), ...monthlyExpenses.keys()])).sort();
  for (const monthKey of allMonthKeys) {
    monthlyProfit.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) - (monthlyExpenses.get(monthKey) ?? 0));
  }

  const revenueChartData: ChartDataPoint[] = Array.from(monthlyRevenue.keys())
    .sort()
    .map((monthKey) => ({
      name: formatMonthLabel(monthKey),
      value: monthlyRevenue.get(monthKey) ?? 0,
    }));

  const profitChartData: ChartDataPoint[] = allMonthKeys.map((monthKey) => ({
    name: formatMonthLabel(monthKey),
    actual: monthlyProfit.get(monthKey) ?? 0,
    projected: monthlyProfit.size > 0
      ? allMonthKeys.reduce((sum, key) => sum + (monthlyProfit.get(key) ?? 0), 0) / monthlyProfit.size
      : 0,
  }));

  const currentRevenue = Number(
    revenueChartData.length > 0 ? revenueChartData[revenueChartData.length - 1].value : 0
  );
  const previousRevenue = Number(
    revenueChartData.length > 1 ? revenueChartData[revenueChartData.length - 2].value : currentRevenue
  );
  const revenueChange = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const currentQuantity = Number(
    allMonthKeys.length > 0 ? monthlyRevenue.get(allMonthKeys[allMonthKeys.length - 1]) ?? 0 : 0
  );
  const previousQuantity = Number(
    allMonthKeys.length > 1 ? monthlyRevenue.get(allMonthKeys[allMonthKeys.length - 2]) ?? currentQuantity : currentQuantity
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
      id: "expenses",
      label: "Total Expenses",
      value: formatCurrency(totalExpenses),
      change: 0,
      changeLabel: "imported",
      trend: "neutral",
    },
    {
      id: "profit",
      label: "Estimated Profit",
      value: formatCurrency(profit),
      change: profit >= 0 ? 1 : -1,
      changeLabel: "based on uploads",
      trend: profit > 0 ? "up" : profit < 0 ? "down" : "neutral",
    },
    {
      id: "customers",
      label: "Total Customers",
      value: formatNumber(customerCount),
      change: 0,
      changeLabel: "based on uploads",
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

              <ChartCard
                title="Profit"
                description="Monthly profit calculated as revenue minus expenses"
              >
                <ProjectedRevenueChart data={profitChartData} />
              </ChartCard>
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Total products sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatNumber(totalQuantitySold)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Inventory items</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{formatNumber(inventoryItemCount)}</p>
                  <p className="text-sm text-muted-foreground">{formatNumber(totalStockCount)} units in stock</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Top product</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{topSellingProduct}</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Top revenue category</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{topRevenueCategory}</p>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Data summary</CardTitle>
                  <CardDescription>
                    Expanded analytics are enabled as additional record types are uploaded.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {expenseRecords.length > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated profit</p>
                      <p className="mt-2 text-2xl font-semibold">{formatCurrency(profit)}</p>
                      <p className="text-xs text-muted-foreground">Based on uploaded expense records</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">Expense analytics</p>
                      <p className="mt-2 text-lg font-semibold">Upload expense records to enable profit calculations.</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Customer spend</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalCustomerSpend)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(customerCount)} customers</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Inventory risk</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(reorderRiskCount)}</p>
                    <p className="text-xs text-muted-foreground">Items low or out of stock</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>Inventory health</CardTitle>
                  <CardDescription>Track stock and reorder risk from uploaded inventory records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Low stock items</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(lowStockCount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total stock</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(totalStockCount)}</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {inventoryItems.length > 0 ? (
              <InventorySummary items={inventoryItems} />
            ) : (
              <Card className="border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle>No inventory data yet</CardTitle>
                  <CardDescription>
                    Upload inventory records to track stock levels and reorder risk.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Inventory summary will appear after inventory data is uploaded.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}