import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/auth";
import AnomaliesClient from "@/components/anomalies/AnomaliesClient";

export default async function AnomaliesPage() {
  await requireUser();

  return (
    <DashboardShell title="Anomalies">
      <AnomaliesClient />
    </DashboardShell>
  );
}
