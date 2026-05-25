"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { DataScopeFilter } from "@/components/dashboard/data-scope-filter";
import type { DataScopeFilter as DataScopeFilterType } from "@/lib/data-scope";

type AnalysisResult = {
  intent?: string;
  summary?: string;
  metrics?: Record<string, number | string>;
  anomalies?: string[];
  recommendations?: string[];
  limitations?: string;
  raw?: string;
  text?: string;
};

const examples = [
  "What products generate most revenue?",
  "Why did profits decrease?",
  "What inventory should I restock?",
  "Which customers spend the most?",
  "What trends do you notice?",
];

export function AnalyticsPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [results, setResults] = useState<Array<{ query: string; result: AnalysisResult }>>([]);
  const [scope, setScope] = useState<DataScopeFilterType>({ timeScope: "all_time" });

  useEffect(() => {
    setMounted(true);

    try {
      const raw = localStorage.getItem("analytics_history");
      if (raw) {
        setResults(JSON.parse(raw));
      }
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // When the applied scope changes, re-run the last query if present
    const lastQuery = results[0]?.query ?? query;
    if (lastQuery) {
      void submit(lastQuery);
    }
  }, [scope, mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem("analytics_history", JSON.stringify(results));
    } catch {}
  }, [mounted, results]);

  const submit = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    setLoading(true);
    setError(null);

    const filters = scope;
    console.log("Sending scope filters to API:", filters);
    console.log("[DEBUG] AnalyticsPanel: Query:", text);

    try {
      const res = await fetch("/api/analytics-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, scope }),
      });

      const payload = await res.json();
      console.log("[DEBUG] AnalyticsPanel: API Response received:", payload);

      if (!res.ok) {
        setError(payload?.error || "Failed to run analytics query.");
        setLoading(false);
        return;
      }

      const analysis: AnalysisResult = {
        text: payload.text ?? payload.answer ?? (payload.analysis && payload.analysis.raw) ?? null,
        raw: payload.raw ?? (payload.text ?? null) ?? JSON.stringify(payload),
      };

      const entry = { query: text, result: analysis };
      setResults((r) => [entry, ...r].slice(0, 20));
      setQuery("");
    } catch (e) {
      setError("Unable to reach analytics API.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
          Loading AI Analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-muted/10 p-4">
        <CardHeader className="p-0">
          <CardTitle className="mb-3">AI Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <DataScopeFilter onChange={setScope} />
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your business data"
                className="flex-1 bg-zinc-900/40 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <Button onClick={() => submit()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  className="rounded-md bg-zinc-800/60 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => submit(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((r, idx) => (
          <Card key={`${r.query}-${idx}`} className="border-border/60 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-sm">{r.query}</CardTitle>
            </CardHeader>
            <CardContent>
              {r.result.text ? (
                <div className="prose prose-invert max-w-none text-sm">
                  {r.result.text.split(/\n\n|\n/).map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              ) : r.result.raw ? (
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{r.result.raw}</pre>
              ) : (
                <div className="space-y-2">
                  {r.result.intent && <p className="text-xs text-muted-foreground">Intent: {r.result.intent}</p>}
                  {r.result.summary && <p className="text-sm">{r.result.summary}</p>}

                  {r.result.metrics && (
                    <div>
                      <h4 className="mt-2 text-xs text-muted-foreground">Metrics</h4>
                      <ul className="mt-1 text-sm list-disc list-inside">
                        {Object.entries(r.result.metrics).map(([k, v]) => (
                          <li key={k}>{k}: {String(v)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.result.anomalies && r.result.anomalies.length > 0 && (
                    <div>
                      <h4 className="mt-2 text-xs text-muted-foreground">Anomalies</h4>
                      <ul className="mt-1 text-sm list-disc list-inside">
                        {r.result.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}

                  {r.result.recommendations && r.result.recommendations.length > 0 && (
                    <div>
                      <h4 className="mt-2 text-xs text-muted-foreground">Recommendations</h4>
                      <ul className="mt-1 text-sm list-disc list-inside">
                        {r.result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                  )}

                  {r.result.limitations && (
                    <p className="mt-2 text-xs text-muted-foreground">Limitations: {r.result.limitations}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsPanel;
