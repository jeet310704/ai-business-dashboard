import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UploadDropzone } from "@/components/uploads/upload-dropzone";
import { UploadHistory } from "@/components/uploads/upload-history";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedUploadFormats } from "@/lib/mock-data";
import type { UploadFileStatus, UploadFileType } from "@/types";

export default async function UploadsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return (
      <DashboardShell title="Uploads">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Complete onboarding first</CardTitle>
              <CardDescription>
                A business record is required before uploads can be associated with your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/onboarding"
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Start onboarding
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, business_id, file_name, file_type, status, uploaded_at")
    .eq("business_id", business.id)
    .order("uploaded_at", { ascending: false });

  const uploadItems = Array.isArray(uploads)
    ? uploads.map((item) => {
        const fileType: UploadFileType = item.file_type === "xlsx" ? "xlsx" : "csv";
        const status: UploadFileStatus = ["uploaded", "completed", "processing", "failed", "queued"].includes(item.status)
          ? (item.status as UploadFileStatus)
          : "completed";

        return {
          id: item.id,
          fileName: item.file_name ?? "Untitled",
          fileType,
          size: "—",
          uploadedAt: item.uploaded_at ?? new Date().toISOString(),
          status,
        };
      })
    : [];

  return (
    <DashboardShell title="Uploads">
      <div className="space-y-8">
        <UploadDropzone
          formats={supportedUploadFormats}
          businessId={business.id}
          userId={user.id}
        />
        {uploadItems.length > 0 ? (
          <UploadHistory items={uploadItems} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No files uploaded yet</CardTitle>
              <CardDescription>
                Upload your first CSV or Excel file to start generating analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-zinc-400">
                Your upload history will appear here once you add business data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
