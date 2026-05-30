"use client";

import { useState } from "react";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";
import { GenerateAiReportButton } from "@/components/reports/generate-ai-report-button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";

export default function ReportScopePanel() {
  const [scope, setScope] = useState<DataScopeFilterType>({ timeScope: "all_time" });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="mb-4 space-y-2">
          <h2 className="text-lg font-semibold text-white">AI report filters</h2>
          <p className="text-sm text-muted-foreground">
            Choose a time range, upload file, or dataset type to scope your next AI report.
          </p>
        </div>
        <DataScopeFilter onChange={setScope} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Current filter</p>
          <p className="text-sm text-foreground">
            {scope.uploadId ? "Selected upload" : "All uploads"} • {scope.datasetType ? `${scope.datasetType} data` : "All datasets"} • {scope.timeScope === "custom" ? `${scope.startDate || "start"} → ${scope.endDate || "end"}` : (scope.timeScope ?? "all time").replace(/_/g, " ")}
          </p>
        </div>
        <GenerateAiReportButton scope={scope} />
      </div>
    </div>
  );
}
