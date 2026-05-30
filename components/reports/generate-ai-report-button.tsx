"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface GenerateAiReportButtonProps {
  scope?: unknown;
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GenerateAiReportButton({ scope }: GenerateAiReportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setReportText(null);

    try {
      const response = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Failed to generate AI report.");
        return;
      }

      const text: string = payload?.text ?? "";

      if (text) {
        // Trigger immediate download so the user gets the file right away
        const date = new Date().toISOString().slice(0, 10);
        downloadTextFile(text, `business-report-${date}.txt`);
        setReportText(text);
      }

      router.refresh();
    } catch (err) {
      setError("Unable to generate AI report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!reportText) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(reportText, `business-report-${date}.txt`);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Generating…" : "Generate AI Report"}
        </Button>

        {reportText && !loading && (
          <Button
            variant="outline"
            onClick={handleDownloadAgain}
            className="inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download again
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
