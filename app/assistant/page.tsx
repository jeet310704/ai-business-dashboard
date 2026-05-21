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

  const { data: salesRecords } = await supabase
    .from("sales_records")
    .select("product_name, category, revenue")
    .eq("business_id", business.id);

  const records = Array.isArray(salesRecords) ? salesRecords : [];

  if (records.length === 0) {
    return (
      <DashboardShell title="Assistant">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Your AI assistant is waiting for sales data</CardTitle>
              <CardDescription>
                Upload sales records first so the assistant can answer questions using your uploaded business data.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/uploads"
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Upload sales data
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const totalRevenue = records.reduce((sum, record) => sum + Number(record.revenue ?? 0), 0);
  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();

  for (const record of records) {
    const revenue = Number(record.revenue ?? 0);
    const product = record.product_name?.trim() || "Unknown product";
    const category = record.category?.trim() || "Other";

    revenueByProduct.set(product, (revenueByProduct.get(product) ?? 0) + revenue);
    revenueByCategory.set(category, (revenueByCategory.get(category) ?? 0) + revenue);
  }

  const bestProduct = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topCategory = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  return (
    <DashboardShell title="Assistant">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle>Sales data summary</CardTitle>
            <CardDescription>
              Your assistant can now reference uploaded sales data. AI chat will be connected later.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sales records</p>
              <p className="mt-2 text-2xl font-semibold">{formatNumber(records.length)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top product</p>
              <p className="mt-2 text-lg font-semibold">{bestProduct}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top category</p>
              <p className="mt-2 text-lg font-semibold">{topCategory}</p>
            </div>
          </CardContent>
        </Card>

        <ChatPanel initialMessages={chatMessages} suggestions={promptSuggestions} />
      </div>
    </DashboardShell>
  );
}
