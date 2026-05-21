import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecommendationsList } from "@/components/insights/recommendations-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const [{ data: salesRecords }, { data: expenseRecords }, { data: inventoryRecords }, { data: customerRecords }] =
    await Promise.all([
      supabase
        .from("sales_records")
        .select("product_name, category, revenue")
        .eq("business_id", business.id),
      supabase
        .from("expense_records")
        .select("amount, expense_date, expense_category")
        .eq("business_id", business.id),
      supabase
        .from("inventory_records")
        .select("product_name, stock, reorder_level")
        .eq("business_id", business.id),
      supabase
        .from("customer_records")
        .select("customer_name, total_spent")
        .eq("business_id", business.id),
    ]);

  const sales = Array.isArray(salesRecords) ? salesRecords : [];
  const expenses = Array.isArray(expenseRecords) ? expenseRecords : [];
  const inventory = Array.isArray(inventoryRecords) ? inventoryRecords : [];
  const customers = Array.isArray(customerRecords) ? customerRecords : [];

  if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
    return (
      <DashboardShell title="Insights">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No insights yet</CardTitle>
              <CardDescription>
                Upload business records to generate insights from your real data.
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

  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();
  let totalRevenue = 0;

  for (const record of sales) {
    const revenue = Number(record.revenue ?? 0);
    totalRevenue += revenue;

    const product = record.product_name?.trim() || "Unknown product";
    const category = record.category?.trim() || "Other";

    revenueByProduct.set(product, (revenueByProduct.get(product) ?? 0) + revenue);
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + revenue);
  }

  const expenseByMonth = new Map<string, number>();
  const expenseCategories = new Map<string, number>();
  for (const record of expenses) {
    const amount = Number(record.amount ?? 0);
    if (!record.expense_date) continue;
    const date = new Date(record.expense_date);
    if (Number.isNaN(date.getTime())) continue;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    expenseByMonth.set(monthKey, (expenseByMonth.get(monthKey) ?? 0) + amount);

    const category = String(record.expense_category ?? "Other").trim();
    expenseCategories.set(category, (expenseCategories.get(category) ?? 0) + amount);
  }

  const lowStockCount = inventory.filter((record) => {
    const stock = Number(record.stock ?? 0);
    const reorderLevel = Number(record.reorder_level ?? 0);
    return stock <= reorderLevel;
  }).length;

  const topCustomerEntry = customers
    .map((record) => ({
      name: record.customer_name?.trim() || "Unknown customer",
      value: Number(record.total_spent ?? 0),
    }))
    .sort((a, b) => b.value - a.value)[0];
  const topCustomer = topCustomerEntry?.name ?? "N/A";
  const topCustomerSpend = topCustomerEntry?.value ?? 0;
  const averageCustomerSpend = customers.length > 0
    ? customers.reduce((sum, record) => sum + Number(record.total_spent ?? 0), 0) / customers.length
    : 0;

  const bestProduct = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topCategory = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const sortedExpenseMonths = Array.from(expenseByMonth.keys()).sort();
  const currentMonth = sortedExpenseMonths[sortedExpenseMonths.length - 1];
  const previousMonth = sortedExpenseMonths[sortedExpenseMonths.length - 2];
  const currentMonthExpenses = currentMonth ? expenseByMonth.get(currentMonth) ?? 0 : 0;
  const previousMonthExpenses = previousMonth ? expenseByMonth.get(previousMonth) ?? 0 : 0;
  const expenseChange = previousMonthExpenses
    ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
    : 0;

  const insightCards = [
    {
      id: "top-category",
      title: `${topCategory} generated the highest revenue`,
      description: `Your ${topCategory} sales produced ${formatCurrency(revenueByCategory.get(topCategory) ?? 0)} in revenue.`,
      impact: "high" as const,
      category: "revenue" as const,
    },
    {
      id: "top-customer",
      title: `Top customer spent ${formatCurrency(topCustomerSpend)}`,
      description: `${topCustomer} is your highest spending customer from uploaded customer data.`,
      impact: "medium" as const,
      category: "customer" as const,
    },
    {
      id: "low-stock",
      title: `${formatNumber(lowStockCount)} products are below reorder level`,
      description: `Inventory data shows ${formatNumber(lowStockCount)} items at or below their reorder threshold.`,
      impact: "high" as const,
      category: "inventory" as const,
    },
    {
      id: "expense-trend",
      title: expenseChange > 0
        ? `Expenses rose ${formatNumber(Math.round(expenseChange))}% this month`
        : "Expense trend is stable",
      description: expenseChange > 0
        ? `Expenses increased from ${formatCurrency(previousMonthExpenses)} to ${formatCurrency(currentMonthExpenses)}.`
        : "Upload more expense records to track month-over-month spending.",
      impact: expenseChange > 10 ? "high" as const : "medium" as const,
      category: "expense" as const,
    },
  ];

  return (
    <DashboardShell title="Insights">
      <article className="space-y-8">
        <section>
          <p className="text-sm text-muted-foreground">Business insights</p>
          <h2 className="text-2xl font-semibold">Real analytics from your uploaded business data</h2>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total revenue</CardTitle>
              <CardDescription>Sum of all uploaded sales</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top category</CardTitle>
              <CardDescription>Highest revenue category</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{topCategory}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top customer</CardTitle>
              <CardDescription>Highest spender from uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{topCustomer}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Low stock items</CardTitle>
              <CardDescription>Inventory below reorder levels</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(lowStockCount)}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Current business outlook</CardTitle>
            <CardDescription>Insights are built from uploaded sales, expense, inventory, and customer data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Average customer spend</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(averageCustomerSpend)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expense trend</p>
              <p className="mt-2 text-2xl font-semibold">{expenseChange > 0 ? `+${formatNumber(Math.round(expenseChange))}%` : "Stable"}</p>
            </div>
          </CardContent>
        </Card>

        <RecommendationsList recommendations={insightCards} />
      </article>
    </DashboardShell>
  );
}
