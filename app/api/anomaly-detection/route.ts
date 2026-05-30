import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText } from "@/lib/gemini";

export async function POST(_request: Request) {
  console.log("[anomaly-detection] route started");
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

    console.log("[anomaly-detection] business id:", business.id);

    const [salesRes, expenseRes, inventoryRes, customerRes] = await Promise.all([
      supabase
        .from("sales_records")
        .select("product_name, category, revenue, quantity, sale_date")
        .eq("business_id", business.id)
        .limit(500),
      supabase
        .from("expense_records")
        .select("amount, category, expense_date")
        .eq("business_id", business.id)
        .limit(500),
      supabase
        .from("inventory_records")
        .select("item_name, stock, reorder_level, unit_cost")
        .eq("business_id", business.id)
        .limit(500),
      supabase
        .from("customer_records")
        .select("customer_name, total_spent")
        .eq("business_id", business.id)
        .limit(200),
    ]);

    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    const expenses = Array.isArray(expenseRes.data) ? expenseRes.data : [];
    const inventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
    const customers = Array.isArray(customerRes.data) ? customerRes.data : [];

    console.log("[anomaly-detection] row counts:", {
      sales: sales.length,
      expenses: expenses.length,
      inventory: inventory.length,
      customers: customers.length,
    });

    const totalRevenue = sales.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const lowStock = inventory.filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0));

    const summary = {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      salesCount: sales.length,
      expenseCount: expenses.length,
      inventoryCount: inventory.length,
      customerCount: customers.length,
      lowStockCount: lowStock.length,
      hasEnoughData:
        sales.length >= 5 ||
        expenses.length >= 5 ||
        inventory.length >= 5 ||
        customers.length >= 5,
    };

    if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
      return NextResponse.json({
        success: true,
        text: "No business data uploaded yet. Upload sales, expense, inventory, or customer records to enable anomaly detection.",
        summary,
        severity: "low",
      });
    }

    const missingDataNote = [
      sales.length === 0 && "sales",
      expenses.length === 0 && "expenses (profit cannot be calculated)",
      inventory.length === 0 && "inventory",
      customers.length === 0 && "customers",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `You are an anomaly detection AI for a small business. Analyze the data below for unusual patterns, risks, and anomalies.

DATA:
- Sales: ${sales.length} records — Total revenue: $${totalRevenue.toFixed(2)}
- Expenses: ${expenses.length} records — Total: $${totalExpenses.toFixed(2)}
- Profit: $${summary.profit.toFixed(2)}
- Inventory: ${inventory.length} items — Low stock: ${lowStock.length}
- Customers: ${customers.length} records
${lowStock.length > 0 ? `- Low stock items: ${lowStock.slice(0, 5).map((i) => `${i.item_name} (${i.stock} units, reorder at ${i.reorder_level})`).join(", ")}` : ""}
${missingDataNote ? `- Missing data: ${missingDataNote}` : ""}

Instructions:
- Start your response with "Severity: low" / "Severity: medium" / "Severity: high" / "Severity: critical"
- List detected anomalies and risks
- Suggest actions
- If data is too limited for meaningful detection, say so clearly
- Plain text only, no JSON or code blocks`;

    const text = await generateAIText(prompt);

    const severityMatch = text.match(/Severity:\s*(low|medium|high|critical)/i);
    const severity = (
      severityMatch?.[1]?.toLowerCase() ?? "low"
    ) as "low" | "medium" | "high" | "critical";

    return NextResponse.json({ success: true, text, summary, severity });
  } catch (error) {
    console.error("[anomaly-detection] error:", error);
    return NextResponse.json(
      { success: false, error: "Anomaly detection failed. Please try again." },
      { status: 500 }
    );
  }
}
