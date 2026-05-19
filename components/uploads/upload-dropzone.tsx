"use client";

import { useCallback, useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import type { SupportedUploadFormat } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UploadDropzoneProps {
  formats: SupportedUploadFormat[];
}

export function UploadDropzone({ formats }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [mockUploading, setMockUploading] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);

  const handleMockUpload = useCallback(() => {
    if (mockUploading) return;
    setMockUploading(true);
    setMockProgress(0);
    const interval = setInterval(() => {
      setMockProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setMockUploading(false);
            setMockProgress(0);
          }, 800);
          return 100;
        }
        return prev + 12;
      });
    }, 200);
  }, [mockUploading]);

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "border-dashed transition-colors",
          isDragging && "border-primary bg-primary/5",
          mockUploading && "border-primary/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleMockUpload();
        }}
      >
        <CardContent className="flex flex-col items-center justify-center px-6 py-12">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Drag and drop your files</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Drop CSV or Excel files here, or click to browse. Max file size 25MB.
          </p>
          <button
            type="button"
            onClick={handleMockUpload}
            disabled={mockUploading}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {mockUploading ? "Uploading..." : "Browse files"}
          </button>
          {mockUploading && (
            <div className="mt-6 w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>sample_data.csv</span>
                <span>{mockProgress}%</span>
              </div>
              <Progress value={mockProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {formats.map((format) => (
          <Card key={format.type} className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {format.type === "csv" ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                )}
                <CardTitle className="text-base">{format.label}</CardTitle>
              </div>
              <CardDescription>{format.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Supported: <span className="font-mono text-foreground">{format.extensions}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Ensure your file has headers in the first row</li>
            <li>Include columns for date, amount, and category at minimum</li>
            <li>Remove empty rows and duplicate entries before uploading</li>
            <li>Files are processed within 2–5 minutes after upload</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
