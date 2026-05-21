import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsightsForBusiness } from "@/lib/ai/generate-insights";

export async function POST() {
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

  const insights = await generateInsightsForBusiness(business.id);
  if (!insights.length) {
    return NextResponse.json({ error: "No insights could be generated." }, { status: 500 });
  }

  await supabase.from("ai_insights").delete().eq("business_id", business.id);

  const insertRows = insights.map((insight) => ({
    business_id: business.id,
    title: insight.title,
    insight: insight.insight,
    severity: insight.severity,
    created_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase.from("ai_insights").insert(insertRows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
