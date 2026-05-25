"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateAiReportButtonProps {
  scope?: unknown;
}

export function GenerateAiReportButton({ scope }: GenerateAiReportButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

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

      router.refresh();
    } catch (err) {
      setError("Unable to generate AI report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleGenerate} disabled={loading} className="inline-flex items-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Generate AI Report
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
