import { parseScope, applyDataScopeToQuery, shouldIncludeTable, getScopeDescription, type DataScopeFilter } from "@/lib/data-scope";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

async function buildBusinessContext(
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
        scope,
        "sale_date"
      )
        .order("sale_date", { ascending: false })
        .limit(50)
        .then((res) => ({ table: "sales", ...res }))
    : Promise.resolve({ table: "sales", data: [], error: null });

  const expensePromise = shouldIncludeTable("expenses", scope)
    ? applyDataScopeToQuery(
        supabase
          .from("expense_records")
          .select("amount, category, expense_date")
          .eq("business_id", businessId),
        scope,
        "expense_date"
      )
        .order("expense_date", { ascending: false })
        .limit(50)
        .then((res) => ({ table: "expenses", ...res }))
    : Promise.resolve({ table: "expenses", data: [], error: null });

  const inventoryPromise = shouldIncludeTable("inventory", scope)
    ? applyDataScopeToQuery(
        supabase.from("inventory_records").select("item_name, stock, reorder_level, unit_cost").eq("business_id", businessId),
        scope
      )
        .limit(50)
        .then((res) => ({ table: "inventory", ...res }))
    : Promise.resolve({ table: "inventory", data: [], error: null });

  const customerPromise = shouldIncludeTable("customers", scope)
    ? applyDataScopeToQuery(
        supabase.from("customer_records").select("customer_name, total_spent").eq("business_id", businessId),
        scope
      )
        .order("total_spent", { ascending: false })
        .limit(50)
        .then((res) => ({ table: "customers", ...res }))
    : Promise.resolve({ table: "customers", data: [], error: null });

  const insightsPromise = supabase
    .from("ai_insights")
    .select("title, insight, severity, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10)
    .then((res) => ({ table: "insights", ...res }));

  const [salesResponse, expenseResponse, inventoryResponse, customerResponse, insightsResponse] =
    await Promise.all([salesPromise, expensePromise, inventoryPromise, customerPromise, insightsPromise]);

  const sales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
  const expenses = Array.isArray(expenseResponse.data) ? expenseResponse.data : [];
  const inventory = Array.isArray(inventoryResponse.data) ? inventoryResponse.data : [];
  const customers = Array.isArray(customerResponse.data) ? customerResponse.data : [];
  const insights = Array.isArray(insightsResponse.data) ? insightsResponse.data : [];

  const datasetAvailability = {
    sales: sales.length,
    expenses: expenses.length,
    inventory: inventory.length,
    customers: customers.length,
    insights: insights.length,
  };

  const totalRevenue = sales.reduce((sum, r) => sum + Number(r.revenue ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;
  const inventoryItems = inventory.length;
  const lowStockItems = inventory.filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0)).length;
  const totalCustomers = customers.length;
  const totalCustomerSpend = customers.reduce((sum, c) => sum + Number(c.total_spent ?? 0), 0);

  const scopeDescription = getScopeDescription(scope);

  const context = `
BUSINESS ANALYTICS CONTEXT
=========================

SELECTED DATA SCOPE: ${scopeDescription}

SALES DATA (recent):
- Total Revenue: $${totalRevenue.toFixed(2)}
- Average Order Value: $${avgOrderValue.toFixed(2)}
- Total Sales Records: ${sales.length}
- Top Products: ${sales.slice(0, 5).map((s) => `${s.product_name} ($${s.revenue})`).join(", ") || "None"}
- Categories: ${Array.from(new Set(sales.map((s) => s.category))).join(", ") || "None"}

EXPENSE DATA (recent):
- Total Expenses: $${totalExpenses.toFixed(2)}
- Expense Categories: ${Array.from(new Set(expenses.map((e) => e.category))).join(", ") || "None"}
- Profit: $${(totalRevenue - totalExpenses).toFixed(2)}

INVENTORY STATUS:
- Total Items: ${inventoryItems}
- Low Stock Items: ${lowStockItems}
${lowStockItems > 0 ? `- Items Below Reorder: ${inventory.filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0)).map((i) => i.item_name).join(", ")}` : ""}

CUSTOMER DATA:
- Total Customers: ${totalCustomers}
- Total Customer Spend: $${totalCustomerSpend.toFixed(2)}
${customers.length > 0 ? `- Top Customer: ${customers[0]?.customer_name} ($${customers[0]?.total_spent})` : ""}
- Average Customer Spend: $${totalCustomers > 0 ? (totalCustomerSpend / totalCustomers).toFixed(2) : 0}

RECENT INSIGHTS (optional background context):
${insights.length > 0 ? insights.map((i) => `- [${new Date(i.created_at).toISOString()}] ${i.title}: ${i.insight} (Severity: ${i.severity})`).join("\n") : "No saved insights available"}

DATA AVAILABILITY:
- sales records: ${datasetAvailability.sales}
- expense records: ${datasetAvailability.expenses}
- inventory records: ${datasetAvailability.inventory}
- customer records: ${datasetAvailability.customers}
- saved insights: ${datasetAvailability.insights}

INSTRUCTIONS:
- You are a business analyst. Answer questions about the above business data.
- Raw business records are the source of truth.
- If saved insights conflict with raw records, ignore saved insights.
- Saved insights are optional background context and may be older than current raw records.
- If only sales data exists, explain that sales data is available and expense, inventory, and customer data are missing.
- Analysis is limited until those datasets are uploaded.
- Only use the data provided. Do not make assumptions or hallucinate numbers.
- If data is insufficient to answer a question, say so clearly.
- Provide concise, actionable insights.
- Keep responses under 500 tokens.
`.trim();

  return {
    context,
    counts: {
      sales: sales.length,
      expenses: expenses.length,
      inventory: inventory.length,
      customers: customers.length,
      insights: insights.length,
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 400 });
    }

    // Parse request
    const body = await request.json().catch(() => ({}));
    const { message, scope: rawScope } = body;
    const scope = parseScope(rawScope);

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const userMessage = message.trim();

    // Save user message
    const { error: saveUserError } = await supabase.from("business_chat_messages").insert({
      business_id: business.id,
      user_id: user.id,
      role: "user",
      content: userMessage,
    });

    if (saveUserError) {
      console.error("Error saving user message:", saveUserError);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Build business context
    const { context, counts } = await buildBusinessContext(business.id, supabase, scope);

    console.log("Scope received:", scope);
    console.log("Filtered row counts:", {
      sales: counts.sales,
      expenses: counts.expenses,
      inventory: counts.inventory,
      customers: counts.customers,
    });

    const hasData = counts.sales > 0 || counts.expenses > 0 || counts.inventory > 0 || counts.customers > 0 || counts.insights > 0;
    if (!hasData) {
      const assistantReply =
        "I don't have any business data to analyze yet. Please upload your sales, expense, inventory, or customer records first to get meaningful insights.";

      // Save assistant response
      await supabase.from("business_chat_messages").insert({
        business_id: business.id,
        user_id: user.id,
        role: "assistant",
        content: assistantReply,
      });

      return NextResponse.json({ message: assistantReply, success: true });
    }

    // Call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });
    const scopeDescription = getScopeDescription(scope);
    const hasNoScopedData =
      counts.sales === 0 && counts.expenses === 0 && counts.inventory === 0 && counts.customers === 0 && counts.insights === 0;

    if (hasNoScopedData) {
      const noDataReply = `No records were found for the selected data scope (${scopeDescription}). Please adjust the filters or try a broader scope.`;
      await supabase.from("business_chat_messages").insert({
        business_id: business.id,
        user_id: user.id,
        role: "assistant",
        content: noDataReply,
      });

      return NextResponse.json({ message: noDataReply, success: true });
    }

    const prompt = `${context}

ANALYZE ONLY THE DATA IN THE SELECTED SCOPE: ${scopeDescription}

QUESTION FROM USER:
${userMessage}

Provide a clear, concise response as a business analyst. Use only the data provided above.`;

    console.log("[AI Chat] Gemini request prompt length:", prompt.length);
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

    console.log("[AI Chat] Gemini response keys:", response ? Object.keys(response).join(", ") : "no response");
    console.log("[AI Chat] Gemini response text length:", response.text?.length ?? 0);

    const assistantReply = response.text?.trim() || "Unable to generate response.";
    console.log("[AI Chat] Gemini reply length:", assistantReply.length, "success:", Boolean(response.text?.trim()));

    // Save assistant response
    const { error: saveAssistantError } = await supabase.from("business_chat_messages").insert({
      business_id: business.id,
      user_id: user.id,
      role: "assistant",
      content: assistantReply,
    });

    if (saveAssistantError) {
      console.error("Error saving assistant message:", saveAssistantError);
      // Still return the response even if save failed
    }

    return NextResponse.json({
      message: assistantReply,
      success: true,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
