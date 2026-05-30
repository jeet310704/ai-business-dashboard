import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText } from "@/lib/gemini";

export async function POST(_request: Request) {
  console.log("[ai-report] route started");
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

    console.log("[ai-report] business id:", business.id);

    const [salesRes, expenseRes, inventoryRes, customerRes] = await Promise.all([
      supabase
        .from("sales_records")
        .select("product_name, category, revenue, sale_date")
        .eq("business_id", business.id)
        .limit(100),
      supabase
        .from("expense_records")
        .select("amount, category, expense_date")
        .eq("business_id", business.id)
        .limit(100),
      supabase
        .from("inventory_records")
        .select("item_name, stock, reorder_level, unit_cost")
        .eq("business_id", business.id)
        .limit(100),
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

    console.log("[ai-report] row counts:", {
      sales: sales.length,
      expenses: expenses.length,
      inventory: inventory.length,
      customers: customers.length,
    });

    if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No business records uploaded yet. Upload data first to generate a report." },
        { status: 400 }
      );
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

    const missingNote = [
      sales.length === 0 && "No sales records uploaded.",
      expenses.length === 0 && "No expense records uploaded.",
      inventory.length === 0 && "No inventory records uploaded.",
      customers.length === 0 && "No customer records uploaded.",
    ]
      .filter(Boolean)
      .join(" ");

    const prompt = `Generate a professional business report from the real data below.

DATA:
- Sales: ${sales.length} records — Revenue: $${totalRevenue.toFixed(2)}
- Expenses: ${expenses.length} records — Total: $${totalExpenses.toFixed(2)}
- Profit: $${(totalRevenue - totalExpenses).toFixed(2)}
- Inventory: ${inventory.length} items — Low stock: ${lowStock.length}
- Customers: ${customers.length} records
${topProducts.length > 0 ? `- Top products: ${topProducts.map(([n, r]) => `${n} ($${r.toFixed(2)})`).join(", ")}` : ""}
${lowStock.length > 0 ? `- Low stock: ${lowStock.map((i) => i.item_name).join(", ")}` : ""}
${missingNote ? `\nDATA GAPS: ${missingNote}` : ""}

Write a report with these sections (each on its own line):
Executive Summary
Revenue Analysis
Expense Analysis
Inventory Analysis
Customer Analysis
Risks
Recommendations

Plain text only. No JSON, no code blocks. For any missing dataset, note the limitation in that section.`;

    const text = await generateAIText(prompt);

    // Save to DB (non-critical — if the table or schema doesn't match, we still return the report)
    try {
      await supabase.from("reports").insert({
        business_id: business.id,
        title: "AI Business Report",
        description: "Generated from real business records.",
        type: "sales",
        status: "ready",
        content: text,
      });
    } catch (err) {
      console.error("[ai-report] Failed to save to DB:", err);
    }

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("[ai-report] error:", error);
    return NextResponse.json(
      { success: false, error: "Report generation failed. Please try again." },
      { status: 500 }
    );
  }
}
