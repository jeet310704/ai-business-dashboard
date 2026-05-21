import type { ElementType } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  Package,
  Users,
} from "lucide-react";
import type { Report, ReportStatus, ReportType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportCardProps {
  report: Report;
}

const typeIcons: Record<ReportType, ElementType> = {
  sales: BarChart3,
  expense: FileText,
  inventory: Package,
  customer: Users,
};

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  ready: { label: "Ready", variant: "success" },
  generating: { label: "Generating", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "secondary" },
};

export function ReportCard({ report }: ReportCardProps) {
  const Icon = typeIcons[report.type];
  const status = statusConfig[report.status];
  const canDownload = report.status === "ready";

  return (
    <Card className="flex flex-col border-border/60 transition-colors hover:border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <CardTitle className="text-base">{report.title}</CardTitle>
        <CardDescription className="line-clamp-2">{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Period</dt>
            <dd className="font-medium">{report.period}</dd>
          </div>
          {report.fileSize && (
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium">{report.fileSize}</dd>
            </div>
          )}
          {report.generatedAt && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Generated</dt>
              <dd className="font-medium">{report.generatedAt}</dd>
            </div>
          )}
        </dl>
        <Button
          variant={canDownload ? "default" : "outline"}
          className="w-full"
          disabled={!canDownload}
        >
          {report.status === "generating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : canDownload ? (
            <>
              <Download className="h-4 w-4" />
              Export PDF
            </>
          ) : (
            "Generate later"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
