import type { UploadType } from "@/types";

export type TimeScopeOption =
  | "all_time"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom";

export type DataScopeFilter = {
  timeScope?: TimeScopeOption;
  startDate?: string;
  endDate?: string;
  uploadId?: string;
  datasetType?: UploadType;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export function getDateRangeForScope(scope: DataScopeFilter) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (scope.timeScope) {
    case "last_7_days": {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 6);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }
    case "last_30_days": {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 29);
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }
    case "this_month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { startDate: formatDate(start), endDate: formatDate(today) };
    }
    case "last_month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case "custom": {
      if (scope.startDate && scope.endDate) {
        return { startDate: scope.startDate, endDate: scope.endDate };
      }
      return {};
    }
    default:
      return {};
  }
}

export function parseScope(raw?: any): DataScopeFilter {
  if (!raw || typeof raw !== "object") {
    return { timeScope: "all_time" };
  }

  const timeScope =
    raw.timeScope === "last_7_days" ||
    raw.timeScope === "last_30_days" ||
    raw.timeScope === "this_month" ||
    raw.timeScope === "last_month" ||
    raw.timeScope === "custom"
      ? raw.timeScope
      : "all_time";

  const startDate = typeof raw.startDate === "string" ? raw.startDate : undefined;
  const endDate = typeof raw.endDate === "string" ? raw.endDate : undefined;
  const uploadId = typeof raw.uploadId === "string" ? raw.uploadId : undefined;
  const datasetType =
    raw.datasetType === "sales" ||
    raw.datasetType === "expenses" ||
    raw.datasetType === "inventory" ||
    raw.datasetType === "customers"
      ? raw.datasetType
      : undefined;

  return { timeScope, startDate, endDate, uploadId, datasetType };
}

export function parseScopeFromSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const timeScope = typeof searchParams.timeScope === "string" ? searchParams.timeScope : undefined;
  const startDate = typeof searchParams.startDate === "string" ? searchParams.startDate : undefined;
  const endDate = typeof searchParams.endDate === "string" ? searchParams.endDate : undefined;
  const uploadId = typeof searchParams.uploadId === "string" ? searchParams.uploadId : undefined;
  const datasetType = typeof searchParams.datasetType === "string" ? searchParams.datasetType : undefined;

  return parseScope({ timeScope, startDate, endDate, uploadId, datasetType });
}

export function applyDataScopeToQuery<T extends { gte?: Function; lte?: Function; eq?: Function }>(
  query: T,
  scope: DataScopeFilter,
  dateField = "record_date"
) {
  const range = getDateRangeForScope(scope);

  if (scope.uploadId && typeof query.eq === "function") {
    query.eq("upload_id", scope.uploadId);
  }

  if (range.startDate && typeof query.gte === "function") {
    query.gte(dateField, range.startDate);
  }

  if (range.endDate && typeof query.lte === "function") {
    query.lte(dateField, range.endDate);
  }

  return query;
}

export function shouldIncludeTable(tableType: UploadType, scope: DataScopeFilter) {
  return !scope.datasetType || scope.datasetType === tableType;
}

export function getScopeDescription(scope: DataScopeFilter) {
  const range = getDateRangeForScope(scope);
  const parts: string[] = [];

  if (scope.uploadId) {
    parts.push("Selected file");
  }

  if (scope.datasetType) {
    parts.push(`${scope.datasetType} data`);
  }

  if (range.startDate || range.endDate) {
    const start = range.startDate ?? "any";
    const end = range.endDate ?? "any";
    parts.push(`from ${start} to ${end}`);
  }

  if (parts.length === 0) {
    return "All time";
  }

  return parts.join(" • ");
}
