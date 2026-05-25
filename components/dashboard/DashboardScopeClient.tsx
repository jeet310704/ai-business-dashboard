"use client";

import { useState } from "react";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";

export default function DashboardScopeClient() {
  const [scope, setScope] = useState<DataScopeFilterType>({ timeScope: "all_time" });

  return <DataScopeFilter onChange={setScope} />;
}
