"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UploadType } from "@/types";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";
import { parseScope } from "@/lib/data-scope";

type TimeScope = "all_time" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "custom";

interface UploadOption {
  id: string;
  file_name: string | null;
  upload_type: UploadType | null;
  uploaded_at: string | null;
}

interface DataScopeFilterProps {
  initialScope?: DataScopeFilterType;
  uploads?: UploadOption[];
  onChange?: (scope: DataScopeFilterType) => void;
  hideDatasetType?: boolean;
}

const timeOptions: Array<{ value: TimeScope; label: string }> = [
  { value: "all_time", label: "All time" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const datasetOptions: Array<{ value: UploadType | ""; label: string }> = [
  { value: "", label: "All datasets" },
  { value: "sales", label: "Sales" },
  { value: "expenses", label: "Expenses" },
  { value: "inventory", label: "Inventory" },
  { value: "customers", label: "Customers" },
];

export function DataScopeFilter({
  initialScope,
  uploads: initialUploads,
  onChange,
  hideDatasetType,
}: DataScopeFilterProps) {
  const [timeScope, setTimeScope] = useState<TimeScope>(
    (initialScope?.timeScope as TimeScope) ?? "all_time"
  );
  const [startDate, setStartDate] = useState(initialScope?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialScope?.endDate ?? "");
  const [uploadId, setUploadId] = useState(initialScope?.uploadId ?? "");
  const [datasetType, setDatasetType] = useState<UploadType | "">(
    initialScope?.datasetType ?? ""
  );
  const [uploads, setUploads] = useState<UploadOption[]>(initialUploads ?? []);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadsError, setUploadsError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUploads && initialUploads.length > 0) {
      setUploads(initialUploads);
      return;
    }

    setLoadingUploads(true);

    fetch("/api/uploads/list")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Unable to load upload files.");
        }

        const json = await res.json();
        setUploads(Array.isArray(json.uploads) ? json.uploads : []);
      })
      .catch((error) => {
        setUploadsError(error?.message || "Failed to load uploads.");
      })
      .finally(() => setLoadingUploads(false));
  }, [initialUploads]);

  const uploadOptions = useMemo(
    () => [
      { value: "", label: "All files" },
      ...uploads.map((upload) => ({
        value: upload.id,
        label: `${upload.file_name ?? "Untitled"} (${upload.upload_type ?? "data"})`,
      })),
    ],
    [uploads]
  );

  const handleApply = () => {
    const appliedFilters = parseScope({
      timeScope,
      startDate,
      endDate,
      uploadId,
      datasetType,
    });

    console.log("Apply Scope clicked", appliedFilters);
    onChange?.(appliedFilters);
  };

  const handleReset = () => {
    setTimeScope("all_time");
    setStartDate("");
    setEndDate("");
    setUploadId("");
    setDatasetType("");

    const resetFilters = parseScope({
      timeScope: "all_time",
      startDate: "",
      endDate: "",
      uploadId: "",
      datasetType: "",
    });

    onChange?.(resetFilters);
  };

  return (
    <Card className="border-border/60 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle>Data scope</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-muted-foreground">
            Time period
            <select
              value={timeScope}
              onChange={(event) => setTimeScope(event.target.value as TimeScope)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-muted-foreground">
            Upload file
            <select
              value={uploadId}
              onChange={(event) => setUploadId(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {loadingUploads ? (
                <option value="">Loading uploads...</option>
              ) : (
                uploadOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {!hideDatasetType && (
          <label className="space-y-2 text-sm text-muted-foreground">
            Dataset type
            <select
              value={datasetType}
              onChange={(event) => setDatasetType(event.target.value as UploadType | "")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {datasetOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {timeScope === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-muted-foreground">
              Start date
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="bg-background text-foreground"
              />
            </label>

            <label className="space-y-2 text-sm text-muted-foreground">
              End date
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="bg-background text-foreground"
              />
            </label>
          </div>
        )}

        {uploadsError && <p className="text-sm text-destructive">{uploadsError}</p>}

        <div className="rounded-2xl border border-border/80 bg-muted p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Scope preview</p>
          <p>{uploadId ? "Filtered to selected upload file." : "All uploaded files"}</p>
          <p>{datasetType ? `Dataset: ${datasetType}` : "All dataset types"}</p>
          <p>
            {timeScope === "all_time"
              ? "All time data"
              : timeScope === "custom"
                ? `Custom range ${startDate || "start"} → ${endDate || "end"}`
                : timeOptions.find((option) => option.value === timeScope)?.label}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset filters
          </Button>

          <Button type="button" onClick={handleApply}>
            Apply scope
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}