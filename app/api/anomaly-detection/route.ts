import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  parseScope,
  applyDataScopeToQuery,
  shouldIncludeTable,
  type DataScopeFilter,
  getScopeDescription,
} from "@/lib/data-scope";

type AnomalySummary = {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  salesCount: number;
  expenseCount: number;
  inventoryCount: number;
  customerCount: number;
  lowStockCount: number;
  largestSale?: { product_name: string; revenue: number; sale_date: string | null };
  largestExpense?: { category: string; amount: number; expense_date: string | null };
  topCustomer?: { customer_name: string; total_spent: number };
  hasEnoughData: boolean;
};

type AnomalyResponse = {
  success: boolean;
  query: string;
  text: string;
  raw: string;
  summary: AnomalySummary;
  severity: "low" | "medium" | "high" | "critical";
};

async function buildAnomalyContext(
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: DataScopeFilter
) {
  const salesPromise = shouldIncludeTable("sales", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("sales_records")
          .select("id, product_name, category, revenue, quantity, sale_date")
          .eq("business_id", businessId),
        scope
      )
        .order("sale_date", { ascending: false })
        .limit(1000)
    : Promise.resolve({ data: [] as any, error: null });

  const expensePromise = shouldIncludeTable("expenses", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("expense_records")
          .select("id, amount, category, expense_date")
          .eq("business_id", businessId),
        scope
      )
        .order("expense_date", { ascending: false })
        .limit(1000)
    : Promise.resolve({ data: [] as any, error: null });

  const inventoryPromise = shouldIncludeTable("inventory", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("inventory_records")
          .select("id, item_name, stock, reorder_level, unit_cost")
          .eq("business_id", businessId),
        scope
      )
        .limit(1000)
    : Promise.resolve({ data: [] as any, error: null });

  const customerPromise = shouldIncludeTable("customers", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("customer_records")
          .select("id, customer_name, total_spent")
          .eq("business_id", businessId),
        scope
      )
        .order("total_spent", { ascending: false })
        .limit(1000)
    : Promise.resolve({ data: [] as any, error: null });

  const [salesRes, expenseRes, inventoryRes, customerRes] = await Promise.all([
    salesPromise,
    expensePromise,
    inventoryPromise,
    customerPromise,
  ]);

  const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
  const expenses = Array.isArray(expenseRes.data) ? expenseRes.data : [];
  const inventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
  const customers = Array.isArray(customerRes.data) ? customerRes.data : [];

    totalExpenses,
    profit,
    salesCount: sales.length,
    expenseCount: expenses.length,
    inventoryCount: inventory.length,
    customerCount: customers.length,
    lowStockCount,
    largestSale: largestSale
      ? {
          product_name: largestSale.product_name ?? "Unknown",
          revenue: Number(largestSale.revenue ?? 0),
          sale_date: largestSale.sale_date ?? null,
        }
      : undefined,
    largestExpense: largestExpense
      ? {
          category: largestExpense.category ?? "Unknown",
          amount: Number(largestExpense.amount ?? 0),
          expense_date: largestExpense.expense_date ?? null,
        }
      : undefined,
    topCustomer: topCustomer
      ? {
          customer_name: topCustomer.customer_name ?? "Unknown",
          total_spent: Number(topCustomer.total_spent ?? 0),
        }
      : undefined,
    hasEnoughData:
      sales.length >= 10 ||
      expenses.length >= 10 ||
      inventory.length >= 10 ||
      customers.length >= 10,
  };

  const context = {
    sales: sales.map((record) => ({
      product_name: record.product_name ?? "Unknown",
      category: record.category ?? "Unknown",
      revenue: Number(record.revenue ?? 0),
      quantity: Number(record.quantity ?? 0),
      sale_date: record.sale_date ?? null,
    })),
    expenses: expenses.map((record) => ({
      category: record.category ?? "Unknown",
      amount: Number(record.amount ?? 0),
      expense_date: record.expense_date ?? null,
    })),
    inventory: inventory.map((record) => ({
      item_name: record.item_name ?? "Unknown",
      stock: Number(record.stock ?? 0),
      reorder_level: Number(record.reorder_level ?? 0),
      unit_cost: Number(record.unit_cost ?? 0),
    })),
    customers: customers.map((record) => ({
      customer_name: record.customer_name ?? "Unknown",
      total_spent: Number(record.total_spent ?? 0),
    })),
    summary,
  };

  return { context, summary };
}

function parseSeverity(text: string): AnomalyResponse["severity"] {
  const match = text.match(/Severity:\s*(low|medium|high|critical)/i);
  if (match) {
    const value = match[1].toLowerCase();
    if (value === "low" || value === "medium" || value === "high" || value === "critical") {
      return value;
    }
  }
  return "medium";
}

function jsonToText(obj: any) {
  const lines: string[] = [];
  if (obj.summary) {
    lines.push("Summary:");
    lines.push(String(obj.summary).trim());
    lines.push("");
  }
  if (obj.severity) {
    lines.push(`Severity: ${String(obj.severity)}`);
    lines.push("");
  }
  if (obj.anomalies && Array.isArray(obj.anomalies)) {
    lines.push("Anomalies:");
    for (const anomaly of obj.anomalies) {
      lines.push(`* ${anomaly}`);
    }
    lines.push("");
  }
  if (obj.causes && Array.isArray(obj.causes)) {
    lines.push("Possible Causes:");
    for (const cause of obj.causes) {
      lines.push(`* ${cause}`);
    }
    lines.push("");
  }
  if (obj.recommendations && Array.isArray(obj.recommendations)) {
    lines.push("Recommendations:");
    for (const item of obj.recommendations) {
      lines.push(`* ${item}`);
    }
    lines.push("");
  }
  if (obj.limitations) {
    lines.push("Limitations:");
    lines.push(String(obj.limitations).trim());
    lines.push("");
  }
  if (!lines.length && typeof obj === "object") {
    lines.push("Analysis:");
    lines.push(JSON.stringify(obj, null, 2));
  }
  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({}));
    const scope = parseScope(payload.scope);
    console.log("Scope received:", scope);

    const { context, summary } = await buildAnomalyContext(business.id, supabase, scope);

    console.log("Filtered row counts:", {
      sales: summary.salesCount,
      expenses: summary.expenseCount,
      inventory: summary.inventoryCount,
      customers: summary.customerCount,
    });

    const totalRecordCount = summary.salesCount + summary.expenseCount + summary.inventoryCount + summary.customerCount;
    if (totalRecordCount === 0) {
      const noDataText = `No records were found for the selected data scope (${getScopeDescription(scope)}). Adjust the filters or select a broader range to run anomaly detection.`;
      return NextResponse.json({
        success: true,
        query: "anomaly_detection",
        text: noDataText,
        raw: noDataText,
        summary,
        severity: "low",
      } as AnomalyResponse);
    }

    const rawRowCount =
      summary.salesCount + summary.expenseCount + summary.inventoryCount + summary.customerCount;

    const insufficientData =
      rawRowCount < 20 &&
      summary.salesCount < 10 &&
      summary.expenseCount < 10 &&
      summary.inventoryCount < 10 &&
      summary.customerCount < 10;

    if (insufficientData) {
      const text = `Anomaly detection is limited because the current upload volume is low. Only ${summary.salesCount} sales records, ${summary.expenseCount} expense records, ${summary.inventoryCount} inventory records, and ${summary.customerCount} customer records are available. Please upload more data so the system can detect anomalies with confidence.`;
      return NextResponse.json({
        success: true,
        query: "anomaly_detection",
        text,
        raw: text,
        summary,
        severity: "low",
      } as AnomalyResponse);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const prompt = `You are an anomaly detection assistant for a small business. Use ONLY the provided numeric facts and records from the context. Do NOT invent or guess missing data. If a dataset is missing or small, clearly explain the limitation.

Context:
${JSON.stringify(context)}

Analyze the business data and identify unusual patterns. Look for sudden revenue drops, expense spikes, unusually large transactions, inventory shortages, declining product performance, abnormal order values, and low sales periods. Explain each anomaly, estimate likely causes, summarize the business risk, and suggest action.

Instructions:
- Return plain text only, no JSON and no code blocks.
- Include a single Severity label near the top: Severity: low, medium, high, or critical.
- Keep the response concise and professional.

If the data is too small for meaningful anomaly detection, say so and explain what more needs to be uploaded.`;

    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const raw = response.text?.trim() ?? "";
    let cleaned = raw;

    const fencedMatch = cleaned.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fencedMatch && fencedMatch[1]) {
      cleaned = fencedMatch[1].trim();
    }

    if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
      try {
        const parsed = JSON.parse(cleaned);
        cleaned = jsonToText(parsed);
      } catch {
        // keep raw text
      }
    }

    const severity = parseSeverity(cleaned);

    return NextResponse.json({
      success: true,
      query: "anomaly_detection",
      text: cleaned,
      raw,
      summary,
      severity,
    } as AnomalyResponse);
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
