"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";

type AnomalySummary = {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  salesCount: number;
  expenseCount: number;
  inventoryCount: number;
  customerCount: number;
  lowStockCount: number;
  largestSale?: { product_name: string; revenue: number; sale_date: string | null };
  largestExpense?: { category: string; amount: number; expense_date: string | null };
  topCustomer?: { customer_name: string; total_spent: number };
  hasEnoughData: boolean;
};

type AnomalyResult = {
  text: string;
  raw: string;
  summary: AnomalySummary;
  severity: "low" | "medium" | "high" | "critical";
};

const severityVariant: Record<AnomalyResult["severity"], "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
};

export default function AnomaliesPanel() {
  const [analysis, setAnalysis] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<DataScopeFilterType>({ timeScope: "all_time" });

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Failed to load anomaly detection.");
        setLoading(false);
        return;
      }

      setAnalysis({
        text: payload.text ?? "No anomaly analysis was returned.",
        raw: payload.raw ?? "",
        summary: payload.summary ?? {
          totalRevenue: 0,
          totalExpenses: 0,
          profit: 0,
          salesCount: 0,
          expenseCount: 0,
          inventoryCount: 0,
          customerCount: 0,
          lowStockCount: 0,
          hasEnoughData: false,
        },
        severity: payload.severity ?? "medium",
      });
    } catch (err) {
      setError("Unable to connect to the anomaly API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch anomalies on mount and whenever the applied scope changes
    void fetchAnomalies();
  }, [scope]);

  const renderText = (content: string) => {
    return content.split(/\n\n|\n/).map((line, index) => (
      <p key={index} className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {line}
      </p>
    ));
  };

  return (
    <div className="space-y-6">
      <DataScopeFilter onChange={setScope} />
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Anomaly Monitoring</p>
          <h1 className="text-2xl font-semibold text-white">Business risk detection</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Detect unusual revenue, expense, inventory, and customer patterns in real business data.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchAnomalies} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh analysis
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">Sales records</CardTitle>
            <CardDescription>{analysis ? analysis.summary.salesCount : "..."} uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{analysis ? analysis.summary.salesCount : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">Expenses</CardTitle>
            <CardDescription>{analysis ? analysis.summary.expenseCount : "..."} records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{analysis ? analysis.summary.expenseCount : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">Inventory items</CardTitle>
            <CardDescription>{analysis ? analysis.summary.inventoryCount : "..."} tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{analysis ? analysis.summary.inventoryCount : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-sm">Customers</CardTitle>
            <CardDescription>{analysis ? analysis.summary.customerCount : "..."} uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-white">{analysis ? analysis.summary.customerCount : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Anomaly detection results</CardTitle>
            <CardDescription>Insights are based only on your uploaded business data.</CardDescription>
          </div>
          {analysis ? (
            <Badge variant={severityVariant[analysis.severity]}>
              {analysis.severity.toUpperCase()}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Refreshing anomaly analysis...
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              {renderText(analysis.text)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No anomaly analysis available yet. Use refresh to run the detection.</p>
          )}
        </CardContent>
      </Card>

      {analysis ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/60 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-sm">Risk summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Profit: {analysis.summary.profit >= 0 ? "$" + analysis.summary.profit.toFixed(2) : "-$" + Math.abs(analysis.summary.profit).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Low stock items: {analysis.summary.lowStockCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-sm">Suggested actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review the anomaly summary above and prioritize the highest severity risks first.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload more records to improve detection accuracy and reduce uncertainty.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
