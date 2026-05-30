"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    product_name: ["product", "product_name", "item_name", "item"],
    category: ["category", "product_category", "category_name"],
    quantity: ["quantity", "qty", "units"],
    unit_price: ["unit_price", "price", "cost"],
    revenue: ["revenue", "amount", "total_revenue", "sales_amount"],
    customer_name: ["customer_name", "name", "client_name"],
    customer_email: ["customer_email", "email", "email_address", "contact_email"],
    payment_method: ["payment_method", "method", "payment"],
    region: ["region", "location", "territory"],
  },
  expenses: {
    date: ["date", "expense_date", "paid_date"],
    expense_name: ["expense_name", "expense", "name", "description"],
    category: ["category", "expense_category", "category_name"],
    amount: ["amount", "expense_amount", "cost"],
    vendor: ["vendor", "merchant", "payee"],
    payment_method: ["payment_method", "method", "payment"],
    notes: ["notes", "note", "description", "memo"],
  },
  inventory: {
    date: ["date", "inventory_date", "stock_date", "received_date"],
    product_name: ["product_name", "item_name", "product", "item"],
    category: ["category", "product_category", "category_name"],
    sku: ["sku", "product_sku"],
    stock_quantity: ["stock_quantity", "stock", "quantity", "qty"],
    reorder_level: ["reorder_level", "reorder", "reorder_qty"],
    unit_cost: ["unit_cost", "price", "cost"],
    supplier: ["supplier", "vendor", "manufacturer"],
  },
  customers: {
    customer_name: ["customer_name", "name", "client_name"],
    customer_email: ["customer_email", "email", "email_address", "contact_email"],
    phone: ["phone", "phone_number", "contact_number"],
    city: ["city", "location", "town"],
    state: ["state", "region", "province"],
    signup_date: ["signup_date", "sign_up_date", "registration_date", "registered_date"],
    total_spend: ["total_spend", "spending", "amount_spent"],
    orders_count: ["orders_count", "order_count", "orders", "orders_total"],
    last_purchase_date: ["last_purchase_date", "purchase_date", "last_order_date"],
  },
};

const requiredFields: Record<UploadType, string[]> = {
  sales: ["date", "product_name", "quantity", "revenue"],
  expenses: ["date", "expense_name", "amount", "vendor"],
  inventory: ["date", "product_name", "category", "sku", "stock_quantity", "reorder_level", "unit_cost", "supplier"],
  customers: ["customer_name", "customer_email", "total_spend", "orders_count"],
};

const formatHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const uploadTypeDetectionRules: Array<{ type: UploadType; aliases: string[][] }> = [
  {
    type: "sales",
    aliases: [
      ["date"],
      ["product_name", "product", "item_name", "item"],
      ["quantity", "qty", "units"],
      ["revenue", "amount", "total_revenue", "sales_amount"],
    ],
  },
  {
    type: "expenses",
    aliases: [
      ["date"],
      ["expense_name", "expense", "expense_name"],
      ["amount", "expense_amount", "cost"],
      ["vendor", "merchant", "payee"],
    ],
  },
  {
    type: "inventory",
    aliases: [
      ["date"],
      ["sku", "product_sku"],
      ["stock_quantity", "stock", "quantity", "qty"],
      ["reorder_level", "reorder", "reorder_qty"],
    ],
  },
  {
    type: "customers",
    aliases: [
      ["customer_name", "name", "client_name"],
      ["customer_email", "email", "email_address", "contact_email"],
      ["total_spend", "spending", "amount_spent"],
    ],
  },
];

function detectUploadType(columns: string[]): UploadType | null {
  const normalizedColumns = new Set(columns.map(formatHeader));

  for (const rule of uploadTypeDetectionRules) {
    const matches = rule.aliases.every((aliasGroup) =>
      aliasGroup.some((alias) => normalizedColumns.has(formatHeader(alias)))
    );

    if (matches) {
      return rule.type;
    }
  }

  return null;
}

async function extractHeaderColumns(file: File): Promise<string[]> {
  const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });

  return (parsed.meta.fields ?? []).map(formatHeader);
}

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
  const validatorName = `${uploadType} validator`;
  console.log("Upload type received:", uploadType);
  console.log("Validator selected:", validatorName);
  console.log("Parser selected: Papa.parse");

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
  const requiredKeys = requiredFields[uploadType];
  const expectedKeys = Object.keys(aliasMap);
  const columns = parsed.meta.fields ?? [];
  const missingRequiredColumns = requiredKeys.filter((key) => !columns.includes(key)).length;

  console.log("CSV columns:", columns);

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

  if (missingRequiredColumns > 0) {
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
      const productName = getValue("product_name");
      const category = getValue("category");
      const quantityValue = getValue("quantity");
      const unitPriceValue = getValue("unit_price");
      const revenueValue = getValue("revenue");
      const customerName = getValue("customer_name");
      const customerEmail = getValue("customer_email");
      const paymentMethod = getValue("payment_method");
      const region = getValue("region");

      const date = new Date(dateValue);
      const quantity = Number(quantityValue);
      const unitPrice = Number(unitPriceValue);
      const revenue = Number(revenueValue);
      const nowIso = new Date().toISOString();

      if (!dateValue || isNaN(date.getTime())) {
        markFieldError("date", "Invalid or missing date.");
      }
      if (!productName) {
        markFieldError("product_name", "Empty product name.");
      }
      if (!quantityValue || isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
        markFieldError("quantity", "Invalid quantity. Use a non-negative integer.");
      }
      if (!revenueValue || isNaN(revenue) || revenue < 0) {
        markFieldError("revenue", "Invalid revenue. Use a non-negative number.");
      }
      if (unitPriceValue && (isNaN(unitPrice) || unitPrice < 0)) {
        markFieldWarning("unit_price", "Invalid unit price. Use a non-negative number.");
      }
      if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        markFieldWarning("customer_email", "Enter a valid email address.");
      }

      if (!rowIssues.length) {
        record.product_name = productName;
        record.category = category || null;
        record.quantity = Math.floor(quantity);
        record.unit_price = isNaN(unitPrice) ? null : unitPrice;
        record.revenue = revenue;
        record.customer_name = customerName || null;
        record.customer_email = customerEmail || null;
        record.payment_method = paymentMethod || null;
        record.region = region || null;
        record.sale_date = date.toISOString();
        record.created_at = nowIso;
      }
    }

    if (uploadType === "expenses") {
      const dateValue = getValue("date");
      const expenseName = getValue("expense_name");
      const category = getValue("category");
      const amountValue = getValue("amount");
      const vendor = getValue("vendor");
      const paymentMethod = getValue("payment_method");
      const notes = getValue("notes");

      const date = new Date(dateValue);
      const amount = Number(amountValue);
      const nowIso = new Date().toISOString();

      if (!dateValue || isNaN(date.getTime())) {
        markFieldError("date", "Invalid or missing date.");
      }
      if (!expenseName) {
        markFieldError("expense_name", "Empty expense name.");
      }
      if (!vendor) {
        markFieldError("vendor", "Empty vendor name.");
      }
      if (!amountValue || isNaN(amount) || amount < 0) {
        markFieldError("amount", "Invalid amount. Use a non-negative number.");
      }

      if (!rowIssues.length) {
        record.expense_name = expenseName;
        record.category = category || null;
        record.amount = amount;
        record.vendor = vendor;
        record.payment_method = paymentMethod || null;
        record.notes = notes || null;
        record.expense_date = date.toISOString();
        record.created_at = nowIso;
      }
    }

    if (uploadType === "inventory") {
      const inventoryDateValue = getValue("date");
      const productName = getValue("product_name");
      const category = getValue("category");
      const sku = getValue("sku");
      const stockValue = getValue("stock_quantity");
      const reorderValue = getValue("reorder_level");
      const unitCostValue = getValue("unit_cost");
      const supplier = getValue("supplier");

      const inventoryDate = new Date(inventoryDateValue);
      const stockQuantity = Number(stockValue);
      const reorderLevel = Number(reorderValue);
      const unitCost = Number(unitCostValue);
      const nowIso = new Date().toISOString();

      if (!inventoryDateValue || isNaN(inventoryDate.getTime())) {
        markFieldError("date", "Invalid or missing inventory date.");
      }
      if (!productName) {
        markFieldError("product_name", "Empty product name.");
      }
      if (!stockValue || isNaN(stockQuantity) || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
        markFieldError("stock_quantity", "Invalid stock quantity. Use a non-negative integer.");
      }
      if (!reorderValue || isNaN(reorderLevel) || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
        markFieldError("reorder_level", "Invalid reorder level. Use a non-negative integer.");
      }
      if (!unitCostValue || isNaN(unitCost) || unitCost < 0) {
        markFieldError("unit_cost", "Invalid unit cost. Use a non-negative number.");
      }

      if (!rowIssues.length) {
        record.inventory_date = inventoryDate.toISOString();
        record.product_name = productName;
        record.category = category || null;
        record.sku = sku || null;
        record.stock_quantity = Math.floor(stockQuantity);
        record.reorder_level = Math.floor(reorderLevel);
        record.unit_cost = unitCost;
        record.supplier = supplier || null;
        record.created_at = nowIso;
      }
    }

    if (uploadType === "customers") {
      const customerName = getValue("customer_name");
      const customerEmail = getValue("customer_email");
      const phone = getValue("phone");
      const city = getValue("city");
      const state = getValue("state");
      const signupDateValue = getValue("signup_date");
      const totalSpendValue = getValue("total_spend");
      const ordersCountValue = getValue("orders_count");
      const lastPurchaseDateValue = getValue("last_purchase_date");

      const totalSpend = Number(totalSpendValue);
      const ordersCount = Number(ordersCountValue);
      const signupDate = new Date(signupDateValue);
      const lastPurchaseDate = new Date(lastPurchaseDateValue);
      const nowIso = new Date().toISOString();

      if (!customerName) {
        markFieldError("customer_name", "Empty customer name.");
      }
      if (!customerEmail) {
        markFieldError("customer_email", "Missing email address.");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        markFieldError("customer_email", "Invalid email address.");
      }
      if (!totalSpendValue || isNaN(totalSpend) || totalSpend < 0) {
        markFieldError("total_spend", "Invalid total spend. Use a non-negative number.");
      }
      if (!ordersCountValue || isNaN(ordersCount) || !Number.isInteger(ordersCount) || ordersCount < 0) {
        markFieldError("orders_count", "Invalid orders count. Use a non-negative integer.");
      }
      if (signupDateValue && isNaN(signupDate.getTime())) {
        markFieldWarning("signup_date", "Invalid signup date. Leave blank or use a valid date.");
      }
      if (lastPurchaseDateValue && isNaN(lastPurchaseDate.getTime())) {
        markFieldWarning("last_purchase_date", "Invalid last purchase date. Leave blank or use a valid date.");
      }

      if (!rowIssues.length) {
        record.customer_name = customerName;
        record.customer_email = customerEmail;
        record.phone = phone || null;
        record.city = city || null;
        record.state = state || null;
        record.signup_date = signupDateValue && !isNaN(signupDate.getTime()) ? signupDate.toISOString() : null;
        record.total_spend = totalSpend;
        record.orders_count = Math.floor(ordersCount);
        record.last_purchase_date = lastPurchaseDateValue && !isNaN(lastPurchaseDate.getTime()) ? lastPurchaseDate.toISOString() : null;
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
    missingColumns: missingRequiredColumns,
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
  if (missingRequiredColumns > 0) {
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
    missingColumns: missingRequiredColumns,
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
  const [autoDetectedUploadType, setAutoDetectedUploadType] = useState<UploadType | null>(null);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    async (file: File, type: UploadType) => {
      if (uploading || parsing) return;
      setErrorMessage("");
      setSuccessMessage("");
      setCurrentFileName(file.name);
      setParsing(true);

      try {
        const result = await validateUploadFile(file, type);
        setValidationResult(result);
        setSelectedFile(file);
      } catch (error: any) {
        setErrorMessage(error?.message || "Unable to parse the CSV file.");
      } finally {
        setParsing(false);
      }
    },
    [uploading, parsing]
  );

  const handleImport = useCallback(
    async (allowWarnings = false) => {
      if (selectedFiles.length === 0) {
        setErrorMessage("No file selected for import.");
        return;
      }

      setUploading(true);
      setProgress(0);
      setErrorMessage("");
      setSuccessMessage("");

      const supabase = createClient();
      let totalRowsImported = 0;

      try {
        for (let index = 0; index < selectedFiles.length; index += 1) {
          const file = selectedFiles[index];
          setCurrentFileName(file.name);
          setProgress(Math.round((index / selectedFiles.length) * 100));

          const headerColumns = await extractHeaderColumns(file);
          const detectedType = detectUploadType(headerColumns);
          const fileUploadType = detectedType ?? uploadType;

          console.log("Upload type received:", fileUploadType);
          console.log("CSV columns:", headerColumns);
          console.log("Validator selected:", fileUploadType);

          if (!fileUploadType) {
            throw new Error("Could not detect CSV type. Please select upload type manually.");
          }

          const validation = await validateUploadFile(file, fileUploadType);
          if (validation.hasCriticalError) {
            throw new Error(`Critical validation issues prevent import for ${file.name}.`);
          }
          if (!allowWarnings && validation.warningCount > 0) {
            throw new Error(`Review warnings before importing ${file.name}.`);
          }

          const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
          const fileType: UploadFileType = extension === "csv" ? "csv" : "xlsx";
          const storagePath = `${businessId}/${userId}/${Date.now()}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("business-uploads")
            .upload(storagePath, file, { upsert: false });

          if (uploadError) {
            throw new Error(uploadError.message || "File upload failed.");
          }

          setProgress(Math.round((index / selectedFiles.length) * 100) + 20);

          const {
            data: insertData,
            error: insertError,
          } = await supabase
            .from("uploads")
            .insert({
              business_id: businessId,
              file_name: file.name,
              file_type: fileType,
              upload_type: fileUploadType,
              uploaded_at: new Date().toISOString(),
              status: "uploaded",
            })
            .select("id")
            .single();

          if (insertError || !insertData) {
            throw new Error(insertError?.message || "Failed to save upload record.");
          }

          const uploadId = insertData.id;
          setProgress(Math.round((index / selectedFiles.length) * 100) + 40);

          await supabase.from("uploads").update({ status: "processing" }).eq("id", uploadId);
          setProgress(Math.round((index / selectedFiles.length) * 100) + 60);

          if (extension === "csv" && validation.validRecords.length > 0) {
            const insertTable =
              fileUploadType === "sales"
                ? "sales_records"
                : fileUploadType === "expenses"
                ? "expense_records"
                : fileUploadType === "inventory"
                ? "inventory_records"
                : "customer_records";

            console.log("Destination table:", insertTable);

            const recordsToInsert = validation.validRecords.map((record) => ({
              ...record,
              business_id: businessId,
              upload_id: uploadId,
            }));

            const { error: insertTableError } = await supabase.from(insertTable).insert(recordsToInsert);
            if (insertTableError) {
              await supabase.from("uploads").update({ status: "failed" }).eq("id", uploadId);
              throw new Error(insertTableError.message || "Failed to import records.");
            }
          }

          const summaryFields: Record<string, unknown> = {
            validation_score: validation.quality,
            warning_count: validation.warningCount,
            rejected_rows: validation.rejectedRows,
            duplicate_rows: validation.duplicateRows,
          };

          const { error: metadataError } = await supabase
            .from("uploads")
            .update(summaryFields)
            .eq("id", uploadId);

          if (metadataError) {
            console.warn("Upload metadata update skipped:", metadataError.message);
          }

          await supabase.from("uploads").update({ status: "completed" }).eq("id", uploadId);
          totalRowsImported += validation.estimatedImportCount;
          setProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
        }

        setSuccessMessage(`Imported ${totalRowsImported} rows from ${selectedFiles.length} file${
          selectedFiles.length === 1 ? "" : "s"
        }.`);
        setTimeout(() => {
          resetUploadState();
        }, 800);
        router.refresh();
      } catch (error: any) {
        setErrorMessage(error?.message || "Unable to upload selected files.");
        resetUploadState();
      }
    },
    [businessId, router, resetUploadState, selectedFiles, uploadType, userId]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const fileArray = files ? Array.from(files) : [];
      if (fileArray.length === 0) {
        return;
      }

      setSelectedFiles(fileArray);
      setErrorMessage("");
      setSuccessMessage("");
      setDetectionMessage(null);
      setSelectedFile(fileArray[0]);
      setCurrentFileName(
        fileArray.length === 1 ? fileArray[0].name : `${fileArray.length} files selected`
      );

      const firstFile = fileArray[0];
      console.log("Selected file:", firstFile);

      try {
        const headerColumns = await extractHeaderColumns(firstFile);
        const detectedType = detectUploadType(headerColumns);

        if (detectedType) {
          console.log("Auto detected upload type:", detectedType);
          setAutoDetectedUploadType(detectedType);
          setUploadType(detectedType);
          setDetectionMessage(null);
          await handleValidateFile(firstFile, detectedType);
        } else {
          setAutoDetectedUploadType(null);
          setDetectionMessage("Could not detect CSV type. Please select upload type manually.");
          await handleValidateFile(firstFile, uploadType);
        }
      } catch (error: any) {
        setErrorMessage(error?.message || "Unable to parse the CSV file.");
      }
    },
    [handleValidateFile, uploadType]
  );

  useEffect(() => {
    if (selectedFiles.length > 0 && selectedFile && !uploading && !parsing) {
      handleValidateFile(selectedFile, uploadType);
    }
  }, [selectedFiles, selectedFile, uploadType, handleValidateFile, uploading, parsing]);

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
        multiple
        accept={acceptedFileTypes}
        className="hidden"
        onChange={(event) => {
          console.log("Selected file:", event.target.files?.[0]);
          handleFiles(event.target.files);
        }}
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
            disabled={uploading || parsing}
          >
            <option value="sales">Sales Data</option>
            <option value="expenses">Expense Data</option>
            <option value="inventory">Inventory Data</option>
            <option value="customers">Customer Data</option>
          </select>
          {autoDetectedUploadType && !detectionMessage ? (
            <p className="mt-2 text-sm text-foreground">Detected upload type: {autoDetectedUploadType}</p>
          ) : null}
          {detectionMessage ? (
            <p className="mt-2 text-sm text-amber-500">{detectionMessage}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-medium">CSV format</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {uploadType === "sales" && "date,product_name,category,quantity,revenue"}
            {uploadType === "expenses" && "date,expense_name,category,amount,vendor"}
            {uploadType === "inventory" && "inventory_date,product_name,stock_quantity,reorder_level,unit_cost"}
            {uploadType === "customers" && "customer_name,customer_email,total_spend,orders_count,last_purchase_date"}
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
            onClick={() => {
              console.log("Browse Files clicked");
              fileInputRef.current?.click();
            }}
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
