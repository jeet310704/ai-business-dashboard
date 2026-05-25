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

async function buildAnalyticsContext(
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: DataScopeFilter
) {
  const salesPromise = shouldIncludeTable("sales", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("sales_records")
          .select("product_name, category, revenue, sale_date")
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
          .select("amount, category, expense_date")
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
          .select("item_name, stock, reorder_level, unit_cost")
          .eq("business_id", businessId),
        scope
      )
        .limit(1000)
    : Promise.resolve({ data: [] as any, error: null });

  const customerPromise = shouldIncludeTable("customers", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("customer_records")
          .select("customer_name, total_spent")
          .eq("business_id", businessId),
        scope
      )
        .order("total_spent", { ascending: false })
        .limit(500)
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

  // Process metrics
  const totalRevenue = sales.reduce((sum, r) => sum + Number(r.revenue ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const profit = totalRevenue - totalExpenses;

  const revenueByProduct = new Map<string, number>();
  const revenueByCategory = new Map<string, number>();
  const monthlyRevenue = new Map<string, number>();

  for (const s of sales) {
    const rev = Number(s.revenue ?? 0);
    const prod = s.product_name || "Unknown";
    const cat = s.category || "General";
    const date = s.sale_date ? new Date(s.sale_date) : new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    revenueByProduct.set(prod, (revenueByProduct.get(prod) ?? 0) + rev);
    revenueByCategory.set(cat, (revenueByCategory.get(cat) ?? 0) + rev);
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) ?? 0) + rev);
  }

  const topProducts = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((p) => ({ name: p[0], revenue: p[1] }));

  const topCategories = Array.from(revenueByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((c) => ({ category: c[0], revenue: c[1] }));

  const monthly = Array.from(monthlyRevenue.entries())
    .sort()
    .map(([k, v]) => ({ month: k, revenue: v }));

  const lowStock = inventory
    .filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0))
    .slice(0, 10)
    .map((i) => ({ item: i.item_name ?? "Unknown", stock: Number(i.stock ?? 0), reorder_level: Number(i.reorder_level ?? 0) }));

  const topCustomers = customers
    .slice(0, 10)
    .map((c) => ({ name: c.customer_name ?? "Unknown", total_spent: Number(c.total_spent ?? 0) }));

  const datasetCounts = {
    sales: sales.length,
    expenses: expenses.length,
    inventory: inventory.length,
    customers: customers.length,
  };

  const context = {
    totals: { totalRevenue, totalExpenses, profit },
    topProducts,
    topCategories,
    monthly,
    lowStock,
    topCustomers,
    datasetCounts,
  };

  return { context };
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
    const query = (payload.query || "").toString().trim();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const scope = parseScope(payload.scope);
    console.log("Scope received:", scope);

    const { context } = await buildAnalyticsContext(business.id, supabase, scope);

    console.log("Filtered row counts:", {
      sales: context.datasetCounts.sales,
      expenses: context.datasetCounts.expenses,
      inventory: context.datasetCounts.inventory,
      customers: context.datasetCounts.customers,
    });

    const totalRecords =
      context.datasetCounts.sales +
      context.datasetCounts.expenses +
      context.datasetCounts.inventory +
      context.datasetCounts.customers;

    if (totalRecords === 0) {
      const noDataReply = `No records were found for the selected data scope (${getScopeDescription(scope)}). Adjust the filters or choose a broader range.`;
      return NextResponse.json({ success: true, query, text: noDataReply, raw: noDataReply });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });

    const prompt = `You are an analytics assistant for a small business. Use ONLY the provided numeric facts and records from the context. Do NOT invent or guess missing data. If a dataset is missing, clearly state what analysis is limited.

Context:
${JSON.stringify(context)}

User question: "${query}"

Instructions:
- Do NOT return JSON, code blocks, or raw objects.
- Write a clear, business-friendly answer using short headings and bullet points.
- Include these sections when relevant: Summary, Key Metrics, Issues/Anomalies, Recommendations, Limitations.
- Use only numeric facts from the context; do not invent numbers.
- Keep the answer concise (3-8 short bullets or sentences per section).

Return a plain text business answer (no code fences, no JSON).`;

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

    // Helper to convert parsed JSON to readable text
    function jsonToText(obj: any) {
      const lines: string[] = [];
      if (obj.summary) {
        lines.push("Summary:");
        lines.push(String(obj.summary).trim());
        lines.push("");
      }
      if (obj.intent) {
        lines.push(`Intent: ${String(obj.intent)}`);
        lines.push("");
      }
      if (obj.metrics && typeof obj.metrics === "object") {
        lines.push("Key Metrics:");
        for (const [k, v] of Object.entries(obj.metrics)) {
          lines.push(`* ${k}: ${v}`);
        }
        lines.push("");
      }
      if (Array.isArray(obj.anomalies) && obj.anomalies.length > 0) {
        lines.push("Issues/Anomalies:");
        for (const a of obj.anomalies) lines.push(`* ${a}`);
        lines.push("");
      }
      if (Array.isArray(obj.recommendations) && obj.recommendations.length > 0) {
        lines.push("Recommendations:");
        for (const r of obj.recommendations) lines.push(`* ${r}`);
        lines.push("");
      }
      if (obj.limitations) {
        lines.push("Limitations:");
        lines.push(String(obj.limitations).trim());
        lines.push("");
      }
      // Fallback: include intent or raw fields
      if (!lines.length && typeof obj === "object") {
        lines.push("Analysis:");
        lines.push(JSON.stringify(obj, null, 2));
      }
      return lines.join("\n");
    }

    let cleaned = raw;

    // If response includes a JSON code block, extract inner content
    const fenced = cleaned.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fenced && fenced[1]) {
      cleaned = fenced[1].trim();
    }

    // If cleaned starts with JSON, try parse and convert to text
    if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
      try {
        const parsed = JSON.parse(cleaned);
        cleaned = jsonToText(parsed);
      } catch (e) {
        // leave cleaned as-is
      }
    }

    // If original raw contained a JSON substring, try to find and convert it
    if (!cleaned || cleaned.length < 10) {
      const jsonSub = raw.match(/({[\s\S]*})/);
      if (jsonSub && jsonSub[1]) {
        try {
          const parsed = JSON.parse(jsonSub[1]);
          cleaned = jsonToText(parsed);
        } catch {}
      }
    }

    // Final fallback: if cleaned still looks like JSON, wrap as plain text
    if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
      cleaned = raw; // keep raw but not as code block
    }

    return NextResponse.json({ success: true, query, text: cleaned, raw });
  } catch (error) {
    console.error("Analytics query error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
