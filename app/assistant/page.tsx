import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chatMessages, promptSuggestions } from "@/lib/mock-data";

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

  const [salesRecords, expenseRecords, inventoryRecords, customerRecords] = await Promise.all([
    supabase.from("sales_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("expense_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("inventory_records").select("id").eq("business_id", business.id).limit(1),
    supabase.from("customer_records").select("id").eq("business_id", business.id).limit(1),
  ]);

  const hasData = [salesRecords, expenseRecords, inventoryRecords, customerRecords].some(
    (records) => Array.isArray(records) && records.length > 0
  );

  if (!hasData) {
    return (
      <DashboardShell title="Assistant">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Your AI assistant is waiting for business data</CardTitle>
              <CardDescription>
                Upload business files first so the assistant can answer questions using your real numbers.
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

  return (
    <DashboardShell title="Assistant">
      <ChatPanel initialMessages={chatMessages} suggestions={promptSuggestions} />
    </DashboardShell>
  );
}
