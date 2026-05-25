import { requireUser } from "@/lib/auth";
import AnalyticsAiClient from "@/components/analytics/AnalyticsAiClient";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AnalyticsAiPage() {
  await requireUser();

  return (
    <DashboardShell title="AI Analytics">
      <div className="space-y-6">
        <AnalyticsAiClient />
      </div>
    </DashboardShell>
  );
}
