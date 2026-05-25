"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";
import type { SupportedUploadFormat, UploadFileType, UploadType } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UploadDropzoneProps {
  formats: SupportedUploadFormat[];
  businessId: string;
  userId: string;
}

type ValidationSeverity = "error" | "warning";

type ValidationQuality = "Excellent" | "Good" | "Warning" | "Poor";

interface ValidationIssue {
  row?: number;
  field?: string;
  message: string;
  severity: ValidationSeverity;
}

interface ValidationResult {
  parsedColumns: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  rejectedRows: number;
  duplicateRows: number;
  missingColumns: number;
  invalidRows: number;
  warningCount: number;
  issues: ValidationIssue[];
  quality: ValidationQuality;
  hasCriticalError: boolean;
  estimatedImportCount: number;
  suggestedFixes: string[];
  validRecords: Record<string, unknown>[];
}

const uploadAliases: Record<UploadType, Record<string, string[]>> = {
  sales: {
    date: ["date", "sale_date", "sales_date"],
    product: ["product", "product_name", "item_name", "item"],
    category: ["category", "product_category", "category_name"],
    quantity: ["quantity", "qty", "units"],
    revenue: ["revenue", "amount", "total_revenue", "sales_amount"],
  },
  expenses: {
    date: ["date", "expense_date", "paid_date"],
    expense_category: ["expense_category", "category", "category_name"],
    amount: ["amount", "expense_amount", "cost"],
    vendor: ["vendor", "merchant", "payee"],
  },
  inventory: {
    item_name: ["item_name", "product", "product_name", "item"],
    stock: ["stock", "quantity", "qty"],
    reorder_level: ["reorder_level", "reorder_level", "reorder"],
    unit_cost: ["unit_cost", "price", "cost"],
  },
  customers: {
    customer_name: ["customer_name", "name", "client_name"],
    email: ["email", "email_address", "contact_email"],
    total_spent: ["total_spent", "spending", "amount_spent"],
    last_purchase_date: ["last_purchase_date", "purchase_date", "last_order_date"],
  },
};

const formatHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function getQualityLabel(result: ValidationResult): ValidationQuality {
  if (result.hasCriticalError || result.totalRows === 0) {
    return "Poor";
  }

  if (result.duplicateRows > result.totalRows * 0.1 || result.warningCount > 3) {
    return "Warning";
  }

  if (result.warningCount > 0 || result.duplicateRows > 0) {
    return "Good";
  }

  return "Excellent";
}

function normalizeHeader(uploadType: UploadType, header: string) {
  const value = formatHeader(header);
  const aliases = uploadAliases[uploadType];

  for (const [canonical, options] of Object.entries(aliases)) {
    if (options.includes(value)) {
      return canonical;
    }
  }

  return value;
}

async function validateUploadFile(file: File, uploadType: UploadType): Promise<ValidationResult> {
  const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => normalizeHeader(uploadType, header),
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });

  const aliasMap = uploadAliases[uploadType];
  const expectedKeys = Object.keys(aliasMap);
  const columns = parsed.meta.fields ?? [];
  const missingColumns = expectedKeys.filter((key) => !columns.includes(key)).length;

  const issues: ValidationIssue[] = [];
  const sampleRows: Record<string, string>[] = [];
  const seenSignatures = new Set<string>();
  const validRecords: Record<string, unknown>[] = [];
  let duplicateRows = 0;
  let rejectedRows = 0;
  let invalidRows = 0;
  let warningCount = 0;

  if (columns.length === 0) {
    issues.push({
      message: "No headers were detected in the CSV file.",
      severity: "error",
    });
  }

  if (missingColumns > 0) {
    issues.push({
      message: "Required columns are missing or inconsistent with the selected upload type.",
      severity: "error",
    });
  }

  const totalRows = parsed.data.length;

  parsed.data.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const rowValues = rawRow;
    const isEmptyRow = Object.values(rowValues).every((value) => !value?.trim?.());
    if (isEmptyRow) {
      return;
    }

    if (sampleRows.length < 5) {
      sampleRows.push(rawRow);
    }

    const rowIssues: ValidationIssue[] = [];
    const record: Record<string, unknown> = { business_id: "", upload_id: "" };

    const getValue = (key: string) => (rowValues[key] ?? "").toString().trim();

    const reportIssue = (field: string | undefined, message: string, severity: ValidationSeverity) => {
      rowIssues.push({ row: rowNumber, field, message, severity });
    };

    const markFieldError = (field: string | undefined, message: string) => {
      reportIssue(field, message, "error");
    };

    const markFieldWarning = (field: string | undefined, message: string) => {
      reportIssue(field, message, "warning");
    };

    if (uploadType === "sales") {
      const dateValue = getValue("date");
      const product = getValue("product");
      const category = getValue("category");
      const quantityValue = getValue("quantity");
      const revenueValue = getValue("revenue");

      const date = new Date(dateValue);
      const quantity = Number(quantityValue);
      const revenue = Number(revenueValue);
      const nowIso = new Date().toISOString();

      if (!dateValue || isNaN(date.getTime())) {
        markFieldError("date", "Invalid or missing date.");
      }
      if (!product) {
        markFieldError("product", "Empty product name.");
      }
      if (!category) {
        markFieldError("category", "Empty category.");
      }
      if (!quantityValue || isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
        markFieldError("quantity", "Invalid quantity. Use a non-negative integer.");
      }
      if (!revenueValue || isNaN(revenue) || revenue < 0) {
        markFieldError("revenue", "Invalid revenue. Use a non-negative number.");
      }

      if (!rowIssues.length) {
        record.product_name = product;
        record.category = category;
        record.quantity = Math.floor(quantity);
        record.revenue = revenue;
        record.sale_date = date.toISOString();
        record.record_date = date.toISOString().slice(0, 10);
        record.created_at = nowIso;
      }
    }

    if (uploadType === "expenses") {
      const dateValue = getValue("date");
      const category = getValue("expense_category");
      const amountValue = getValue("amount");
      const vendor = getValue("vendor");

      const date = new Date(dateValue);
      const amount = Number(amountValue);
      const nowIso = new Date().toISOString();

      if (!dateValue || isNaN(date.getTime())) {
        markFieldError("date", "Invalid or missing date.");
      }
      if (!category) {
        markFieldError("expense_category", "Empty expense category.");
      }
      if (!vendor) {
        markFieldError("vendor", "Empty vendor name.");
      }
      if (!amountValue || isNaN(amount) || amount < 0) {
        markFieldError("amount", "Invalid amount. Use a non-negative number.");
      }

      if (!rowIssues.length) {
        record.category = category;
        record.amount = amount;
        record.vendor = vendor;
        record.expense_date = date.toISOString();
        record.record_date = date.toISOString().slice(0, 10);
        record.created_at = nowIso;
      }
    }

    if (uploadType === "inventory") {
      const itemName = getValue("item_name");
      const stockValue = getValue("stock");
      const reorderValue = getValue("reorder_level");
      const unitCostValue = getValue("unit_cost");

      const stock = Number(stockValue);
      const reorderLevel = Number(reorderValue);
      const unitCost = Number(unitCostValue);
      const now = new Date();
      const nowIso = now.toISOString();

      if (!itemName) {
        markFieldError("item_name", "Empty item name.");
      }
      if (!stockValue || isNaN(stock) || !Number.isInteger(stock) || stock < 0) {
        markFieldError("stock", "Invalid stock quantity. Use a non-negative integer.");
      }
      if (!reorderValue || isNaN(reorderLevel) || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
        markFieldError("reorder_level", "Invalid reorder level. Use a non-negative integer.");
      }
      if (unitCostValue && isNaN(unitCost)) {
        markFieldWarning("unit_cost", "Malformed unit cost. Leave blank or use a number.");
      }

      if (!rowIssues.length) {
        record.item_name = itemName;
        record.stock = Math.floor(stock);
        record.reorder_level = Math.floor(reorderLevel);
        record.unit_cost = isNaN(unitCost) ? null : unitCost;
        record.record_date = now.toISOString().slice(0, 10);
        record.created_at = nowIso;
      }
    }

    if (uploadType === "customers") {
      const customerName = getValue("customer_name");
      const email = getValue("email");
      const totalSpentValue = getValue("total_spent");
      const purchaseDateValue = getValue("last_purchase_date");

      const totalSpent = Number(totalSpentValue);
      const purchaseDate = new Date(purchaseDateValue);
      const nowIso = new Date().toISOString();

      if (!customerName) {
        markFieldError("customer_name", "Empty customer name.");
      }
      if (!email) {
        markFieldError("email", "Missing email address.");
      }
      if (!totalSpentValue || isNaN(totalSpent) || totalSpent < 0) {
        markFieldError("total_spent", "Invalid total spent. Use a non-negative number.");
      }
      if (!purchaseDateValue || isNaN(purchaseDate.getTime())) {
        markFieldError("last_purchase_date", "Invalid or missing purchase date.");
      }

      if (!rowIssues.length) {
        record.customer_name = customerName;
        record.email = email;
        record.total_spent = totalSpent;
        record.last_purchase_date = purchaseDate.toISOString();
        record.record_date = purchaseDate.toISOString().slice(0, 10);
        record.created_at = nowIso;
      }
    }

    const signature = JSON.stringify(columns.map((field) => rawRow[field] ?? ""));
    if (!rowIssues.length && seenSignatures.has(signature)) {
      duplicateRows += 1;
      warningCount += 1;
      issues.push({
        row: rowNumber,
        message: "Duplicate row detected and excluded from import.",
        severity: "warning",
      });
      return;
    }

    if (!rowIssues.length) {
      seenSignatures.add(signature);
      validRecords.push(record);
      return;
    }

    rejectedRows += 1;
    invalidRows += 1;
    rowIssues.forEach((issue) => {
      issues.push(issue);
      if (issue.severity === "warning") {
        warningCount += 1;
      }
    });
  });

  const hasCriticalError = issues.some((issue) => issue.severity === "error");
  const estimatedImportCount = Math.max(0, totalRows - rejectedRows - duplicateRows);
  const quality = getQualityLabel({
    parsedColumns: columns,
    sampleRows,
    totalRows,
    rejectedRows,
    duplicateRows,
    missingColumns,
    invalidRows,
    warningCount,
    issues,
    quality: "Excellent",
    hasCriticalError,
    estimatedImportCount,
    suggestedFixes: [],
    validRecords,
  });

  const suggestedFixes: string[] = [];
  if (missingColumns > 0) {
    suggestedFixes.push("Check your CSV headers and make sure required columns match the selected upload type.");
  }
  if (duplicateRows > 0) {
    suggestedFixes.push("Remove duplicate rows before importing or allow deduplication during import.");
  }
  if (warningCount > 0 && !hasCriticalError) {
    suggestedFixes.push("Review the warning rows and correct formats for better quality.");
  }

  return {
    parsedColumns: columns,
    sampleRows,
    totalRows,
    rejectedRows,
    duplicateRows,
    missingColumns,
    invalidRows,
    warningCount,
    issues,
    quality,
    hasCriticalError,
    estimatedImportCount,
    suggestedFixes,
    validRecords,
  };
}

function getBadgeVariant(score: ValidationQuality): "success" | "warning" | "destructive" | "default" {
  switch (score) {
    case "Excellent":
      return "success";
    case "Good":
      return "default";
    case "Warning":
      return "warning";
    case "Poor":
      return "destructive";
    default:
      return "default";
  }
}

export function UploadDropzone({ formats, businessId, userId }: UploadDropzoneProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("sales");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const acceptedFileTypes = formats.map((format) => format.extensions).join(",");

  const resetUploadState = useCallback(() => {
    setUploading(false);
    setParsing(false);
    setProgress(0);
    setCurrentFileName(null);
    setSelectedFile(null);
    setValidationResult(null);
  }, []);

  const handleValidateFile = useCallback(
    async (file: File) => {
      if (uploading || parsing) return;
      setErrorMessage("");
      setSuccessMessage("");
      setCurrentFileName(file.name);
      setParsing(true);

      try {
        const result = await validateUploadFile(file, uploadType);
        setValidationResult(result);
        setSelectedFile(file);
      } catch (error: any) {
        setErrorMessage(error?.message || "Unable to parse the CSV file.");
      } finally {
        setParsing(false);
      }
    },
    [uploadType, uploading, parsing]
  );

  const handleImport = useCallback(
    async (allowWarnings = false) => {
      if (!selectedFile) {
        setErrorMessage("No file selected for import.");
        return;
      }
      if (!validationResult) {
        setErrorMessage("Validation must complete before importing.");
        return;
      }
      if (validationResult.hasCriticalError) {
        setErrorMessage("Critical validation issues prevent import.");
        return;
      }
      if (!allowWarnings && validationResult.warningCount > 0) {
        setErrorMessage("Review warnings before importing or choose Import Anyway.");
        return;
      }

      setUploading(true);
      setProgress(10);
      setErrorMessage("");
      setSuccessMessage("");

      const extension = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
      const fileType: UploadFileType = extension === "csv" ? "csv" : "xlsx";
      const storagePath = `${businessId}/${userId}/${Date.now()}-${selectedFile.name}`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("business-uploads")
        .upload(storagePath, selectedFile, { upsert: false });

      if (uploadError) {
        setErrorMessage(uploadError.message || "File upload failed.");
        resetUploadState();
        return;
      }

      setProgress(35);

      const {
        data: insertData,
        error: insertError,
      } = await supabase
        .from("uploads")
        .insert({
          business_id: businessId,
          file_name: selectedFile.name,
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
      setProgress(50);

      await supabase.from("uploads").update({ status: "processing" }).eq("id", uploadId);
      setProgress(60);

      if (extension === "csv" && validationResult.validRecords.length > 0) {
        const insertTable =
          uploadType === "sales"
            ? "sales_records"
            : uploadType === "expenses"
            ? "expense_records"
            : uploadType === "inventory"
            ? "inventory_records"
            : "customer_records";

        const recordsToInsert = validationResult.validRecords.map((record) => ({
          ...record,
          business_id: businessId,
          upload_id: uploadId,
        }));

        const { error: insertTableError } = await supabase.from(insertTable).insert(recordsToInsert);
        if (insertTableError) {
          await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
          setErrorMessage(insertTableError.message || "Failed to import records.");
          resetUploadState();
          return;
        }
      }

      const summaryFields: Record<string, unknown> = {
        validation_score: validationResult.quality,
        warning_count: validationResult.warningCount,
        rejected_rows: validationResult.rejectedRows,
        duplicate_rows: validationResult.duplicateRows,
      };

      const { error: metadataError } = await supabase
        .from("uploads")
        .update(summaryFields)
        .eq("id", uploadId);

      if (metadataError) {
        console.warn("Upload metadata update skipped:", metadataError.message);
      }

      await supabase.from("uploads").update({ status: "completed" }).eq("id", uploadId);
      setProgress(100);
      setSuccessMessage(`Imported ${validationResult.estimatedImportCount} rows from ${selectedFile.name}.`);
      setTimeout(() => {
        resetUploadState();
      }, 800);
      router.refresh();
    },
    [businessId, router, resetUploadState, selectedFile, uploadType, userId, validationResult]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) {
        handleValidateFile(file);
      }
    },
    [handleValidateFile]
  );

  const validationSummary = useMemo(() => {
    if (!validationResult) {
      return null;
    }

    return (
      <Card className="space-y-4 border-border/60 bg-muted/60">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Validation preview</CardTitle>
              <CardDescription>Review parsed columns, sample rows, and quality issues before import.</CardDescription>
            </div>
            <Badge variant={getBadgeVariant(validationResult.quality)}>{validationResult.quality}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Rows processed</p>
              <p className="mt-2 font-semibold text-foreground">{validationResult.totalRows}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Estimated import</p>
              <p className="mt-2 font-semibold text-foreground">{validationResult.estimatedImportCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Rejected rows</p>
              <p className="mt-2 font-semibold text-foreground">{validationResult.rejectedRows}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Duplicate rows</p>
              <p className="mt-2 font-semibold text-foreground">{validationResult.duplicateRows}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Parsed columns</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {validationResult.parsedColumns.map((column) => (
                  <span key={column} className="rounded-full border border-border/60 bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {column}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Detected issues</p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                {validationResult.issues.slice(0, 4).map((issue, index) => (
                  <div key={`${issue.row}-${index}`} className="rounded-lg border border-border/70 bg-muted/80 p-3">
                    <p className="text-xs uppercase text-muted-foreground">{issue.severity}</p>
                    <p>{issue.row ? `Row ${issue.row}: ` : ""}{issue.message}</p>
                  </div>
                ))}
                {validationResult.issues.length === 0 && <p className="text-sm text-muted-foreground">No issues detected.</p>}
              </div>
            </div>
          </div>

          {validationResult.suggestedFixes.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-muted-foreground">Suggested fixes</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground">
                {validationResult.suggestedFixes.map((fix, index) => (
                  <li key={index}>{fix}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground">Sample rows</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {validationResult.parsedColumns.map((column) => (
                      <th key={column} className="pb-2 pr-4 font-medium">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validationResult.sampleRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border/50 last:border-0">
                      {validationResult.parsedColumns.map((column) => (
                        <td key={column} className="py-2 pr-4 text-foreground">
                          {row[column] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {validationResult.hasCriticalError
                ? "Critical errors block import until the CSV format is corrected."
                : validationResult.warningCount > 0
                ? "Warnings are present, but you may import anyway."
                : "No validation errors found. Ready to import."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => resetUploadState()}
                disabled={uploading || parsing}
              >
                Reset
              </Button>
              <Button
                onClick={() => handleImport(false)}
                disabled={uploading || parsing || validationResult.hasCriticalError}
              >
                Import dataset
              </Button>
              {!validationResult.hasCriticalError && validationResult.warningCount > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => handleImport(true)}
                  disabled={uploading || parsing}
                >
                  Import anyway
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [validationResult, handleImport, resetUploadState, uploading, parsing]);

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
            disabled={uploading || parsing || Boolean(selectedFile)}
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
            disabled={uploading || parsing}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading || parsing ? "Processing..." : "Browse files"}
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

      {validationResult ? validationSummary : null}

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
