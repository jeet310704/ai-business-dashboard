import { FileSpreadsheet, FileText } from "lucide-react";
import type { UploadFileStatus, UploadHistoryItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

interface UploadHistoryProps {
  items: UploadHistoryItem[];
}

const statusConfig: Record<
  UploadFileStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" }
> = {
  completed: { label: "Completed", variant: "success" },
  processing: { label: "Processing", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  queued: { label: "Queued", variant: "secondary" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = d.getUTCHours() % 12 || 12;
  const ampm = d.getUTCHours() >= 12 ? "PM" : "AM";
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${hours}:${minutes} ${ampm}`;
}

export function UploadHistory({ items }: UploadHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
        <CardDescription>Recent file uploads and processing status</CardDescription>
      </CardHeader>
      <CardContent>
        <article className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">File</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Size</th>
                <th className="pb-3 pr-4 font-medium">Uploaded</th>
                <th className="pb-3 pr-4 font-medium">Records</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = statusConfig[item.status];
                return (
                  <tr key={item.id} className="border-b border-border/50 last:border-0">
                    <td className="py-4 pr-4">
                      <span className="flex items-center gap-2">
                        {item.fileType === "csv" ? (
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-400" />
                        )}
                        <span className="font-medium">{item.fileName}</span>
                      </span>
                      {item.status === "processing" && item.progress !== undefined && (
                        <Progress value={item.progress} className="mt-2 max-w-[200px]" />
                      )}
                    </td>
                    <td className="py-4 pr-4 uppercase text-muted-foreground">{item.fileType}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{item.size}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDate(item.uploadedAt)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {item.records ? formatNumber(item.records) : "—"}
                    </td>
                    <td className="py-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </CardContent>
    </Card>
  );
}
