import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // Fetch chat history
    const { data: messages, error: messagesError } = await supabase
      .from("business_chat_messages")
      .select("id, role, content, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (messagesError) {
      console.error("Error fetching chat history:", messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    const [
      salesCountRes,
      expenseCountRes,
      inventoryCountRes,
      customerCountRes,
      insightsCountRes,
    ] = await Promise.all([
      supabase
        .from("sales_records")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("expense_records")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("inventory_records")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("customer_records")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("ai_insights")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
    ]);

    const datasetSummary = {
      sales: salesCountRes.count ?? 0,
      expenses: expenseCountRes.count ?? 0,
      inventory: inventoryCountRes.count ?? 0,
      customers: customerCountRes.count ?? 0,
      insights: insightsCountRes.count ?? 0,
    };

    return NextResponse.json({ messages: messages || [], datasetSummary });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
