"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import type { UploadFileStatus, UploadHistoryItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  uploaded: { label: "Uploaded", variant: "default" },
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
  const router = useRouter();

  // Track IDs the user has deleted this session. A ref (not state) so mutations
  // don't trigger extra renders, and the set persists across re-renders.
  const deletedIds = useRef<Set<string>>(new Set());

  // Derive the visible list: always exclude anything already deleted.
  // This prevents a deleted item from reappearing when router.refresh() sends
  // a stale server response (e.g. Supabase RLS silently blocking the row delete).
  const [displayItems, setDisplayItems] = useState(() =>
    items.filter((i) => !deletedIds.current.has(i.id))
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // When the server sends fresh items (after router.refresh or new upload),
  // update the list but always keep deleted IDs filtered out.
  useEffect(() => {
    setDisplayItems(items.filter((i) => !deletedIds.current.has(i.id)));
  }, [items]);

  const handleDelete = useCallback(
    async (uploadId: string, fileName: string) => {
      if (
        !window.confirm(
          `Delete '${fileName}'? This will remove the upload record and all associated data rows.`
        )
      ) {
        return;
      }

      setDeletingId(uploadId);
      setMessage(null);

      // Optimistically remove from view immediately
      deletedIds.current.add(uploadId);
      setDisplayItems((current) => current.filter((item) => item.id !== uploadId));

      try {
        const response = await fetch("/api/uploads/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload.error) {
          // Rollback: remove from deleted set so it can show again
          deletedIds.current.delete(uploadId);
          setDisplayItems(items.filter((i) => !deletedIds.current.has(i.id)));
          throw new Error(payload.error || "Delete failed.");
        }

        setMessage({ type: "success", text: "Upload deleted successfully." });
        setDisplayItems((current) => current.filter((item) => item.id !== uploadId));
        console.log("Delete upload success", uploadId);
        console.log("Reloaded upload history");
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: (error as Error).message || "Unable to delete upload.",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [items, router]
  );

  if (displayItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>Recent file uploads and processing status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No uploads yet. Upload a dataset above to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
        <CardDescription>Recent file uploads and processing status</CardDescription>
      </CardHeader>
      <CardContent>
        {message ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-950/10 text-emerald-200"
                : "border-rose-200 bg-rose-950/10 text-rose-200"
            }`}
          >
            {message.text}
          </div>
        ) : null}
        <article className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">File</th>
                <th className="pb-3 pr-4 font-medium">Data type</th>
                <th className="pb-3 pr-4 font-medium">Size</th>
                <th className="pb-3 pr-4 font-medium">Uploaded</th>
                <th className="pb-3 pr-4 font-medium">Records</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item) => {
                const status = statusConfig[item.status];
                const isDeleting = deletingId === item.id;
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
                    <td className="py-4 pr-4 uppercase text-muted-foreground">
                      {item.uploadType ?? item.fileType}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{item.size}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDate(item.uploadedAt)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {item.records ? formatNumber(item.records) : "—"}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.fileName)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? "Deleting…" : "Delete"}
                      </Button>
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
