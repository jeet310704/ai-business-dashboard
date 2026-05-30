"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";

interface DashboardScopeClientProps {
  initialScope?: DataScopeFilterType;
}

export default function DashboardScopeClient({ initialScope }: DashboardScopeClientProps) {
  const router = useRouter();

  const handleScopeChange = useCallback(
    (scope: DataScopeFilterType) => {
      console.log("Applying scope:", scope);
      const params = new URLSearchParams();

      if (scope.timeScope && scope.timeScope !== "all_time") {
        params.set("timeScope", scope.timeScope);
      }
      if (scope.uploadId) {
        params.set("uploadId", scope.uploadId);
      }
      if (scope.datasetType) {
        params.set("datasetType", scope.datasetType);
      }
      if (scope.timeScope === "custom") {
        if (scope.startDate) params.set("startDate", scope.startDate);
        if (scope.endDate) params.set("endDate", scope.endDate);
      }

      const qs = params.toString();
      router.replace(`/dashboard${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  return <DataScopeFilter initialScope={initialScope} onChange={handleScopeChange} />;
}
