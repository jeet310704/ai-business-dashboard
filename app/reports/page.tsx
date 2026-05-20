import { requireUser } from "@/lib/auth";
import { ReportCard } from "@/components/reports/report-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reports } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  await requireUser();
  const readyCount = reports.filter((r) => r.status === "ready").length;

  return (
    <DashboardShell title="Reports">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{readyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last month revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(84000)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reports scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">1</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Monthly reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>

        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-base">Analytics summary</CardTitle>
            <CardDescription>
              Reports are generated from your uploaded data. Export as PDF when ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect your data sources and upload files to enable automated monthly report
              generation. Enterprise plans include custom report templates.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
