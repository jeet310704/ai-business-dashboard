import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText } from "@/lib/gemini";

export async function POST(request: Request) {
  console.log("[analytics-query] route started");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ success: false, error: "Business not found" }, { status: 400 });
    }

    console.log("[analytics-query] business id:", business.id);

    const body = await request.json().catch(() => ({}));
    const query = (body.query || "").toString().trim();
    if (!query) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 });
    }

    const [salesRes, expenseRes, inventoryRes, customerRes] = await Promise.all([
      supabase
        .from("sales_records")
        .select("product_name, category, revenue, sale_date")
        .eq("business_id", business.id)
        .limit(200),
      supabase
        .from("expense_records")
        .select("amount, category, expense_date")
        .eq("business_id", business.id)
        .limit(200),
      supabase
        .from("inventory_records")
        .select("item_name, stock, reorder_level, unit_cost")
        .eq("business_id", business.id)
        .limit(200),
      supabase
        .from("customer_records")
        .select("customer_name, total_spent")
        .eq("business_id", business.id)
        .limit(100),
    ]);

    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    const expenses = Array.isArray(expenseRes.data) ? expenseRes.data : [];
    const inventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
    const customers = Array.isArray(customerRes.data) ? customerRes.data : [];

    console.log("[analytics-query] row counts:", {
      sales: sales.length,
      expenses: expenses.length,
      inventory: inventory.length,
      customers: customers.length,
    });

    if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
      return NextResponse.json({
        success: true,
        text: "No business data has been uploaded yet. Please upload sales, expense, inventory, or customer records to enable analytics.",
      });
    }

    const totalRevenue = sales.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const lowStock = inventory.filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0));

    // Top products by revenue
    const productRevenue: Record<string, number> = {};
    for (const r of sales) {
      const p = String(r.product_name ?? "Unknown");
      productRevenue[p] = (productRevenue[p] ?? 0) + Number(r.revenue ?? 0);
    }
    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const missingDataNote = [
      sales.length === 0 && "sales",
      expenses.length === 0 && "expenses",
      inventory.length === 0 && "inventory",
      customers.length === 0 && "customers",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `You are a business analytics AI. Answer the user's question using only the data provided below. Do not invent numbers.

BUSINESS DATA SUMMARY:
- Sales: ${sales.length} records — Total revenue: $${totalRevenue.toFixed(2)}
- Expenses: ${expenses.length} records — Total: $${totalExpenses.toFixed(2)}
- Profit: $${(totalRevenue - totalExpenses).toFixed(2)}
- Inventory: ${inventory.length} items — Low stock: ${lowStock.length}
- Customers: ${customers.length} records
${topProducts.length > 0 ? `- Top products: ${topProducts.map(([name, rev]) => `${name} ($${rev.toFixed(2)})`).join(", ")}` : ""}
${lowStock.length > 0 ? `- Low stock items: ${lowStock.map((i) => i.item_name).join(", ")}` : ""}
${missingDataNote ? `- Missing datasets: ${missingDataNote} (analysis limited until uploaded)` : ""}

USER QUESTION: ${query}

Answer clearly using short headings and bullet points. If data is missing, explain what analysis is limited.`;

    const text = await generateAIText(prompt);
    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("[analytics-query] error:", error);
    return NextResponse.json({ success: false, error: "Analytics query failed. Please try again." }, { status: 500 });
  }
}
