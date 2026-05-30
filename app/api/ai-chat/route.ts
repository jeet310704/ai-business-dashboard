import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText } from "@/lib/gemini";

export async function POST(request: Request) {
  console.log("[ai-chat] route started");
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

    console.log("[ai-chat] business id:", business.id);

    const body = await request.json().catch(() => ({}));
    const message = (body.message || "").toString().trim();
    if (!message) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    // Save user message (non-critical)
    try {
      await supabase.from("business_chat_messages").insert({
        business_id: business.id,
        user_id: user.id,
        role: "user",
        content: message,
      });
    } catch {}

    // Fetch business records
    const [salesRes, expenseRes, inventoryRes, customerRes] = await Promise.all([
      supabase
        .from("sales_records")
        .select("product_name, category, revenue")
        .eq("business_id", business.id)
        .limit(50),
      supabase
        .from("expense_records")
        .select("amount, category")
        .eq("business_id", business.id)
        .limit(50),
      supabase
        .from("inventory_records")
        .select("item_name, stock, reorder_level")
        .eq("business_id", business.id)
        .limit(50),
      supabase
        .from("customer_records")
        .select("customer_name, total_spent")
        .eq("business_id", business.id)
        .limit(50),
    ]);

    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    const expenses = Array.isArray(expenseRes.data) ? expenseRes.data : [];
    const inventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
    const customers = Array.isArray(customerRes.data) ? customerRes.data : [];

    console.log("[ai-chat] row counts:", {
      sales: sales.length,
      expenses: expenses.length,
      inventory: inventory.length,
      customers: customers.length,
    });

    if (sales.length === 0 && expenses.length === 0 && inventory.length === 0 && customers.length === 0) {
      const reply = "No business data has been uploaded yet. Please upload sales, expense, inventory, or customer records to get started.";
      try {
        await supabase.from("business_chat_messages").insert({
          business_id: business.id,
          user_id: user.id,
          role: "assistant",
          content: reply,
        });
      } catch {}
      return NextResponse.json({ success: true, text: reply });
    }

    const totalRevenue = sales.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const lowStock = inventory.filter((i) => Number(i.stock ?? 0) <= Number(i.reorder_level ?? 0));

    const missingDataNote = [
      expenses.length === 0 && "expense data",
      inventory.length === 0 && "inventory data",
      customers.length === 0 && "customer data",
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `You are a business analyst AI assistant. Answer the user's question using only the data provided below. Do not invent numbers.

BUSINESS DATA:
- Sales: ${sales.length} records — Total revenue: $${totalRevenue.toFixed(2)}
- Expenses: ${expenses.length} records — Total expenses: $${totalExpenses.toFixed(2)}
- Profit: $${(totalRevenue - totalExpenses).toFixed(2)}
- Inventory: ${inventory.length} items — Low stock: ${lowStock.length}
- Customers: ${customers.length} records
${sales.length > 0 ? `- Sample products: ${sales.slice(0, 5).map((s) => `${s.product_name ?? "Unknown"} ($${s.revenue})`).join(", ")}` : ""}
${lowStock.length > 0 ? `- Low stock items: ${lowStock.map((i) => i.item_name).join(", ")}` : ""}
${missingDataNote ? `- Missing data: ${missingDataNote} (analysis is limited until uploaded)` : ""}

USER QUESTION: ${message}

Respond clearly and concisely. If data is missing, say so.`;

    const text = await generateAIText(prompt);

    // Save assistant response (non-critical)
    try {
      await supabase.from("business_chat_messages").insert({
        business_id: business.id,
        user_id: user.id,
        role: "assistant",
        content: text,
      });
    } catch {}

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("[ai-chat] error:", error);
    return NextResponse.json({ success: false, error: "AI chat failed. Please try again." }, { status: 500 });
  }
}
