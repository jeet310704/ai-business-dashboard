import { UploadDropzone } from "@/components/uploads/upload-dropzone";
import { UploadHistory } from "@/components/uploads/upload-history";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { supportedUploadFormats, uploadHistory } from "@/lib/mock-data";

export default function UploadsPage() {
  return (
    <DashboardShell title="Uploads">
      <div className="space-y-8">
        <UploadDropzone formats={supportedUploadFormats} />
        <UploadHistory items={uploadHistory} />
      </div>
    </DashboardShell>
  );
}
