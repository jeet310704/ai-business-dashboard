"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import type { SupportedUploadFormat, UploadFileType, UploadType } from "@/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UploadDropzoneProps {
  formats: SupportedUploadFormat[];
  businessId: string;
  userId: string;
}

export function UploadDropzone({ formats, businessId, userId }: UploadDropzoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("sales");

  const acceptedFileTypes = formats.map((format) => format.extensions).join(",");

  const resetUploadState = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setCurrentFileName(null);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (uploading) return;

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["csv", "xlsx", "xls"].includes(extension)) {
        setErrorMessage("Only CSV and Excel files are supported.");
        return;
      }

      const fileType: UploadFileType = extension === "csv" ? "csv" : "xlsx";
      const storagePath = `${businessId}/${userId}/${Date.now()}-${file.name}`;
      const supabase = createClient();

      setUploading(true);
      setCurrentFileName(file.name);
      setErrorMessage("");
      setSuccessMessage("");
      setProgress(10);

      const { error: uploadError } = await supabase.storage
        .from("business-uploads")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        setErrorMessage(uploadError.message || "File upload failed.");
        resetUploadState();
        return;
      }

      setProgress(40);

      // Insert an uploads row and get the id back
      const {
        data: insertData,
        error: insertError,
      } = await supabase
        .from("uploads")
        .insert({
          business_id: businessId,
          file_name: file.name,
          file_type: fileType,
          upload_type: uploadType,
          uploaded_at: new Date().toISOString(),
          status: "uploaded",
        })
        .select("id")
        .single();

      if (insertError || !insertData) {
        setErrorMessage(insertError?.message || "Failed to save upload record.");
        resetUploadState();
        return;
      }

      const uploadId = insertData.id;

      // Mark as processing
      await supabase.from("uploads").update({ status: "processing" }).eq("id", uploadId);

      setProgress(60);

      // Only parse CSV for now
      if (extension === "csv") {
        try {
          const parseResult = await new Promise<Papa.ParseResult<Record<string, unknown>>>((resolve, reject) => {
            Papa.parse<Record<string, unknown>>(file, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (res: Papa.ParseResult<Record<string, unknown>>) => resolve(res),
              error: (err) => reject(err),
            });
          });

          const rows = Array.isArray(parseResult.data) ? parseResult.data : [];
          const toInsert: Record<string, unknown>[] = [];
          const uploadLabel = uploadType === "sales"
            ? "sales"
            : uploadType === "expenses"
            ? "expense"
            : uploadType === "inventory"
            ? "inventory"
            : "customer";

          for (const r of rows) {
            if (uploadType === "sales") {
              const dateRaw = String(r["date"] ?? "").trim();
              const product = String(r["product"] ?? "").trim();
              const category = String(r["category"] ?? "").trim();
              const quantityRaw = r["quantity"];
              const revenueRaw = r["revenue"];

              const dateObj = new Date(dateRaw);
              const quantity = Number(quantityRaw);
              const revenue = Number(revenueRaw);

              if (!dateRaw || isNaN(dateObj.getTime()) || !product || !category || isNaN(quantity) || isNaN(revenue)) {
                continue;
              }

              toInsert.push({
                business_id: businessId,
                upload_id: uploadId,
                product_name: product,
                category,
                quantity: Math.floor(quantity),
                revenue,
                sale_date: dateObj.toISOString(),
              });
            }

            if (uploadType === "expenses") {
              const dateRaw = String(r["date"] ?? "").trim();
              const category = String(r["expense_category"] ?? "").trim();
              const amountRaw = r["amount"];
              const vendor = String(r["vendor"] ?? "").trim();

              const dateObj = new Date(dateRaw);
              const amount = Number(amountRaw);

              if (!dateRaw || isNaN(dateObj.getTime()) || !category || !vendor || isNaN(amount)) {
                continue;
              }

              toInsert.push({
                business_id: businessId,
                upload_id: uploadId,
                category: category,
                amount,
                vendor,
                expense_date: dateObj.toISOString(),
              });
            }

            if (uploadType === "inventory") {
              const item = String(r["product"] ?? r["item_name"] ?? "").trim();
              const stockRaw = r["stock"];
              const reorderLevelRaw = r["reorder_level"];
              const unitCostRaw = r["unit_cost"] ?? r["price"] ?? 0;

              const stock = Number(stockRaw);
              const reorderLevel = Number(reorderLevelRaw);
              const unitCost = Number(unitCostRaw);

              if (!item || isNaN(stock) || isNaN(reorderLevel)) {
                continue;
              }

              toInsert.push({
                business_id: businessId,
                upload_id: uploadId,
                item_name: item,
                stock: Math.floor(stock),
                reorder_level: Math.floor(reorderLevel),
                unit_cost: isNaN(unitCost) ? null : unitCost,
              });
            }

            if (uploadType === "customers") {
              const customerName = String(r["customer_name"] ?? "").trim();
              const email = String(r["email"] ?? "").trim();
              const totalSpentRaw = r["total_spent"];
              const purchaseDateRaw = String(r["last_purchase_date"] ?? "").trim();

              const totalSpent = Number(totalSpentRaw);
              const purchaseDate = new Date(purchaseDateRaw);

              if (!customerName || !email || !purchaseDateRaw || isNaN(purchaseDate.getTime()) || isNaN(totalSpent)) {
                continue;
              }

              toInsert.push({
                business_id: businessId,
                upload_id: uploadId,
                customer_name: customerName,
                email,
                total_spent: totalSpent,
                last_purchase_date: purchaseDate.toISOString(),
              });
            }
          }

          if (toInsert.length > 0) {
            const insertTable =
              uploadType === "sales"
                ? "sales_records"
                : uploadType === "expenses"
                ? "expense_records"
                : uploadType === "inventory"
                ? "inventory_records"
                : "customer_records";
            const { error: insertError } = await supabase.from(insertTable).insert(toInsert);
            if (insertError) {
              await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
              setErrorMessage(insertError.message || `Failed to insert ${uploadLabel} records.`);
              resetUploadState();
              return;
            }

            await supabase.from("uploads").update({ status: "completed" }).eq("id", uploadId);
            setSuccessMessage(`Uploaded ${toInsert.length} ${uploadType} rows from ${file.name}`);
          } else {
            await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
            setErrorMessage(`No valid ${uploadLabel} rows found in CSV.`);
            resetUploadState();
            return;
          }
        } catch (err: any) {
          await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
          setErrorMessage(err?.message || "CSV parsing failed.");
          resetUploadState();
          return;
        }
      } else {
        await supabase.from("uploads").update({ status: "completed" }).eq("id", uploadId);
        setSuccessMessage(`Uploaded ${uploadType} file ${file.name}. Excel parsing will be handled later.`);
      }

      setProgress(100);
      // Refresh immediately so server component shows new history
      router.refresh();
      setTimeout(() => {
        resetUploadState();
      }, 600);
    },
    [businessId, router, resetUploadState, uploading, uploadType, userId]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="uploadType" className="text-sm font-medium text-muted-foreground">
            Select upload type
          </label>
          <select
            id="uploadType"
            value={uploadType}
            onChange={(event) => setUploadType(event.target.value as UploadType)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={uploading}
          >
            <option value="sales">Sales Data</option>
            <option value="expenses">Expense Data</option>
            <option value="inventory">Inventory Data</option>
            <option value="customers">Customer Data</option>
          </select>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-medium">CSV format</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {uploadType === "sales" && "date,product,category,quantity,revenue"}
            {uploadType === "expenses" && "date,expense_category,amount,vendor"}
            {uploadType === "inventory" && "item_name,stock,reorder_level,unit_cost"}
            {uploadType === "customers" && "customer_name,email,total_spent,last_purchase_date"}
          </p>
        </div>
      </div>
      <Card
        className={cn(
          "border-dashed transition-colors",
          isDragging && "border-primary bg-primary/5",
          uploading && "border-primary/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Browse files"}
          </button>

          {currentFileName && (
            <div className="mt-6 w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentFileName}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {errorMessage && (
            <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
          )}
          {successMessage && (
            <p className="mt-4 text-sm text-emerald-600">{successMessage}</p>
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
