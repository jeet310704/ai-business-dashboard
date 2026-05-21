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

  const [
    { data: salesRecords },
    { data: expenseRecords },
    { data: inventoryRecords },
    { data: customerRecords },
  ] = await Promise.all([
    supabase
      .from("sales_records")
      .select("product_name, category, revenue")
      .eq("business_id", business.id),
    supabase
      .from("expense_records")
      .select("amount")
      .eq("business_id", business.id),
    supabase
      .from("inventory_records")
      .select("id")
      .eq("business_id", business.id),
    supabase
      .from("customer_records")
      .select("id, total_spent")
      .eq("business_id", business.id),
  ]);

  const sales = Array.isArray(salesRecords) ? salesRecords : [];
  const expenses = Array.isArray(expenseRecords) ? expenseRecords : [];
  const inventory = Array.isArray(inventoryRecords) ? inventoryRecords : [];
  const customers = Array.isArray(customerRecords) ? customerRecords : [];

  const totalRevenue = sales.reduce((sum, record) => sum + Number(record.revenue ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalInventoryItems = inventory.length;
  const totalCustomers = customers.length;
  const productCount = new Set(
    sales.map((record) => record.product_name?.trim() ?? "").filter(Boolean)
  ).size;
  const categoryCount = new Set(
    sales.map((record) => record.category?.trim() ?? "").filter(Boolean)
  ).size;

  if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
    return (
      <DashboardShell title="Reports">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No reports generated yet</CardTitle>
              <CardDescription>
                Upload business data to start generating report summaries.
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

  const reportCards = [
    {
      id: "sales-summary",
      title: "Sales Summary Report",
      description: `Revenue overview from ${formatNumber(sales.length)} sales records.`,
      type: "sales" as const,
      status: sales.length > 0 ? "ready" as const : "scheduled" as const,
      period: "Latest sales uploads",
    },
    {
      id: "expense-summary",
      title: "Expense Summary Report",
      description: `Expense overview from ${formatNumber(expenses.length)} uploaded records.`,
      type: "expense" as const,
      status: expenses.length > 0 ? "ready" as const : "scheduled" as const,
      period: "Latest expense uploads",
    },
    {
      id: "inventory-health",
      title: "Inventory Health Report",
      description: `Stock status from ${formatNumber(totalInventoryItems)} inventory records.`,
      type: "inventory" as const,
      status: inventory.length > 0 ? "ready" as const : "scheduled" as const,
      period: "Latest inventory uploads",
    },
    {
      id: "customer-insights",
      title: "Customer Summary Report",
      description: `Customer spend and engagement from ${formatNumber(totalCustomers)} uploaded customers.`,
      type: "customer" as const,
      status: customers.length > 0 ? "ready" as const : "scheduled" as const,
      period: "Latest customer uploads",
    },
  ];

  return (
    <DashboardShell title="Reports">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estimated profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalProfit)}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(productCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(categoryCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inventory items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(totalInventoryItems)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(totalCustomers)}</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Generated reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {reportCards.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base">Analytics summary</CardTitle>
            <CardDescription>
              These summaries are generated from your uploaded record data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload more business data to keep these report summaries current and actionable.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
