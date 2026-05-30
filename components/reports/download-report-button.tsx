"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadReportButtonProps {
  content: string;
  filename?: string;
}

export function DownloadReportButton({ content, filename = "business-report.txt" }: DownloadReportButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} className="inline-flex items-center gap-2">
      <Download className="h-4 w-4" />
      Download report
    </Button>
  );
}
