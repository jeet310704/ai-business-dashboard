import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chatMessages, promptSuggestions } from "@/lib/mock-data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function AssistantPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <DashboardShell title="Assistant">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Complete onboarding first</CardTitle>
              <CardDescription>
                Create your business record before your AI assistant can use your data.
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
      <DashboardShell title="Assistant">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Your assistant is waiting for uploads</CardTitle>
              <CardDescription>
                Upload your business data so this page can summarize revenue, expenses, customers, and inventory health.
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

  const totalRevenue = sales.reduce((sum, record) => sum + Number(record.revenue ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
  const profit = totalRevenue - totalExpenses;
  const customerCount = customers.length;
  const totalStock = inventory.reduce((sum, record) => sum + Number(record.stock ?? 0), 0);
  const lowStockCount = inventory.filter((record) => {
    const stock = Number(record.stock ?? 0);
    const reorderLevel = Number(record.reorder_level ?? 0);
    return stock <= reorderLevel;
  }).length;

  const bestProduct = Array.from(
    sales.reduce((map, record) => {
      const name = record.product_name?.trim() || "Unknown product";
      const revenue = Number(record.revenue ?? 0);
      map.set(name, (map.get(name) ?? 0) + revenue);
      return map;
    }, new Map<string, number>()).entries()
  )
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const inventoryHealth = lowStockCount > 0 ? "At risk" : "Healthy";

  return (
    <DashboardShell title="Assistant">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Business context</CardTitle>
            <CardDescription>
              Your assistant can now use uploaded business data to provide better context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(profit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="mt-2 text-2xl font-semibold">{formatNumber(customerCount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inventory health</p>
              <p className="mt-2 text-2xl font-semibold">{inventoryHealth}</p>
              <p className="text-xs text-muted-foreground">{formatNumber(lowStockCount)} low stock items</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top product</p>
              <p className="mt-2 text-lg font-semibold">{bestProduct}</p>
            </div>
          </CardContent>
        </Card>

        <ChatPanel initialMessages={chatMessages} suggestions={promptSuggestions} />
      </div>
    </DashboardShell>
  );
}
