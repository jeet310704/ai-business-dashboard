"use client";

import type { ComponentProps } from "react";
import { DataScopeFilter as BaseDataScopeFilter } from "@/components/data-scope/data-scope-filter";

export type DashboardDataScopeFilterProps = ComponentProps<typeof BaseDataScopeFilter>;

export function DataScopeFilter(props: DashboardDataScopeFilterProps) {
  return <BaseDataScopeFilter {...props} />;
}
