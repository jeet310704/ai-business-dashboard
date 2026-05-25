import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const uploadId = typeof payload.uploadId === "string" ? payload.uploadId : "";

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required." }, { status: 400 });
    }

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

    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("id, business_id, file_name")
      .eq("id", uploadId)
      .eq("business_id", business.id)
      .maybeSingle();

    if (uploadError || !upload) {
      return NextResponse.json({ error: "Upload not found." }, { status: 404 });
    }

    const recordTables = ["sales_records", "expense_records", "inventory_records", "customer_records"];
    for (const table of recordTables) {
      await supabase.from(table).delete().eq("upload_id", uploadId);
    }

    const { error: deleteUploadError } = await supabase.from("uploads").delete().eq("id", uploadId);
    if (deleteUploadError) {
      return NextResponse.json({ error: "Failed to delete upload." }, { status: 500 });
    }

    if (upload.file_name) {
      const storagePrefix = `${business.id}/${user.id}/`;
      const { data: storageObjects, error: storageError } = await supabase
        .storage
        .from("business-uploads")
        .list(storagePrefix, { limit: 1000 });

      if (!storageError && Array.isArray(storageObjects) && storageObjects.length > 0) {
        const matchingFiles = storageObjects.filter((object) =>
          typeof object.name === "string" && object.name.endsWith(`-${upload.file_name}`)
        );

        if (matchingFiles.length > 0) {
          const pathsToRemove = matchingFiles.map((object) =>
            typeof object.name === "string" && object.name.startsWith(storagePrefix)
              ? object.name
              : `${storagePrefix}${object.name}`
          );

          await supabase.storage.from("business-uploads").remove(pathsToRemove);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload deletion error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
