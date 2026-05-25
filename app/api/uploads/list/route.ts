import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const { data: uploads, error: uploadsError } = await supabase
      .from("uploads")
      .select("id, file_name, upload_type, uploaded_at")
      .eq("business_id", business.id)
      .order("uploaded_at", { ascending: false })
      .limit(100);

    if (uploadsError) {
      return NextResponse.json({ error: uploadsError.message || "Failed to list uploads." }, { status: 500 });
    }

    return NextResponse.json({ uploads: Array.isArray(uploads) ? uploads : [] });
  } catch (error) {
    console.error("Uploads list error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
