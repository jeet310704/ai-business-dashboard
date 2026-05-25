import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  parseScope,
  applyDataScopeToQuery,
  shouldIncludeTable,
  getScopeDescription,
  type DataScopeFilter,
} from "@/lib/data-scope";

async function buildReportContext(
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
        .limit(100)
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
        .limit(100)
    : Promise.resolve({ data: [] as any, error: null });

  const inventoryPromise = shouldIncludeTable("inventory", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("inventory_records")
          .select("item_name, stock, reorder_level, unit_cost")
          .eq("business_id", businessId),
        scope
      )
        .limit(100)
    : Promise.resolve({ data: [] as any, error: null });

  const customerPromise = shouldIncludeTable("customers", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("customer_records")
          .select("customer_name, total_spent, email")
          .eq("business_id", businessId),
        scope
      )
        .order("total_spent", { ascending: false })
        .limit(100)
    : Promise.resolve({ data: [] as any, error: null });

  const insightsPromise = supabase
    .from("ai_insights")
    .select("title, insight, severity, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  const [salesResponse, expenseResponse, inventoryResponse, customerResponse, insightsResponse] = await Promise.all([
    salesPromise,
    expensePromise,
    inventoryPromise,
    customerPromise,
    insightsPromise,
  ]);
  const sales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
  const expenses = Array.isArray(expenseResponse.data) ? expenseResponse.data : [];
  const inventory = Array.isArray(inventoryResponse.data) ? inventoryResponse.data : [];
  const customers = Array.isArray(customerResponse.data) ? customerResponse.data : [];
  const insights = Array.isArray(insightsResponse.data) ? insightsResponse.data : [];

  const totalRevenue = sales.reduce((sum, item) => sum + Number(item.revenue ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const totalCustomers = customers.length;
  const totalInventoryItems = inventory.length;
  const lowStockItems = inventory.filter((item) => Number(item.stock ?? 0) <= Number(item.reorder_level ?? 0)).map((item) => item.item_name ?? "Unknown");
  const averageCustomerSpend = totalCustomers > 0 ? customers.reduce((sum, item) => sum + Number(item.total_spent ?? 0), 0) / totalCustomers : 0;
  const topProducts = Array.from(new Set(sales.map((item) => item.product_name).filter(Boolean))).slice(0, 5);
  const topCategories = Array.from(new Set(sales.map((item) => item.category).filter(Boolean))).slice(0, 5);
  const datasetCounts = {
    sales: sales.length,
    expenses: expenses.length,
    inventory: inventory.length,
    customers: customers.length,
    insights: insights.length,
  };

  const reportText = `BUSINESS REPORT CONTEXT
=======================

DATA SOURCE: Raw business records are the source of truth. Saved insights are optional background context only. If saved insights conflict with raw records, ignore saved insights.

DATA AVAILABILITY:
- Sales records: ${datasetCounts.sales}
- Expense records: ${datasetCounts.expenses}
- Inventory records: ${datasetCounts.inventory}
- Customer records: ${datasetCounts.customers}
- Saved AI insights: ${datasetCounts.insights}

SALES SUMMARY:
- Total revenue: $${totalRevenue.toFixed(2)}
- Sales records count: ${sales.length}
- Top product examples: ${topProducts.length > 0 ? topProducts.join(", ") : "None"}
- Categories: ${topCategories.length > 0 ? topCategories.join(", ") : "None"}

EXPENSE SUMMARY:
- Total expenses: $${totalExpenses.toFixed(2)}
- Expense records count: ${expenses.length}

INVENTORY SUMMARY:
- Total inventory items: ${totalInventoryItems}
- Low stock item count: ${lowStockItems.length}
- Low stock examples: ${lowStockItems.slice(0, 5).join(", ") || "None"}

CUSTOMER SUMMARY:
- Customer records count: ${totalCustomers}
- Average customer spend: $${averageCustomerSpend.toFixed(2)}

SAVED INSIGHTS (optional background):
${insights.length > 0
    ? insights
        .map(
          (insight) =>
            `- [${new Date(insight.created_at).toISOString()}] ${insight.title}: ${insight.insight} (Severity: ${insight.severity})`
        )
        .join("\n")
    : "No saved insights available."}

LIMITATIONS:
- If a dataset is missing, state that analysis is limited until it is uploaded.
- Do not invent any numbers beyond those given here.
`.trim();

  return { reportText, datasetCounts };
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

    const { reportText, datasetCounts } = await buildReportContext(business.id, supabase, scope);

    console.log("Filtered row counts:", {
      sales: datasetCounts.sales,
      expenses: datasetCounts.expenses,
      inventory: datasetCounts.inventory,
      customers: datasetCounts.customers,
    });

    const hasSourceData =
      datasetCounts.sales > 0 ||
      datasetCounts.expenses > 0 ||
      datasetCounts.inventory > 0 ||
      datasetCounts.customers > 0;

    if (!hasSourceData) {
      return NextResponse.json({ error: "No records found for this selected file or date range." }, { status: 400 });
    }
    const prompt = `${reportText}

REPORT SCOPE: ${getScopeDescription(scope)}

Generate a professional business report with the following sections:
- Executive Summary
- Revenue Analysis
- Expense Analysis
- Inventory Analysis
- Customer Analysis
- Risks
- Recommendations

Return the report as a clear text document with each section labeled.
`;

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

    const reportBody = response.text?.trim();
    if (!reportBody) {
      return NextResponse.json({ error: "AI report generation failed." }, { status: 500 });
    }

    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        business_id: business.id,
        title: "AI Business Report",
        description: "Comprehensive report generated from your real business records.",
        type: "sales",
        status: "ready",
        content: reportBody,
      })
      .select("id, title, description, type, status, content, created_at")
      .single();

    if (insertError || !insertedReport) {
      console.error("Failed to save report:", insertError);
      return NextResponse.json({ error: "Failed to save generated report." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: {
        id: insertedReport.id,
        title: insertedReport.title,
        description: insertedReport.description,
        type: insertedReport.type,
        status: insertedReport.status,
        content: insertedReport.content,
        generatedAt: insertedReport.created_at,
      },
    });
  } catch (error) {
    console.error("AI report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
