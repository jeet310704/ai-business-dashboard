import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const uploadId = typeof payload.uploadId === "string" ? payload.uploadId : "";

    console.log("Delete upload request:", uploadId);

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required." }, { status: 400 });
    }

    // Auth + ownership checks use the cookie-based anon client (respects RLS for reads)
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

    // Use the service-role admin client for all delete operations so RLS never
    // silently blocks the deletion (ownership is already verified above).
    const admin = createAdminClient();

    const recordTables = ["sales_records", "expense_records", "inventory_records", "customer_records"];
    for (const table of recordTables) {
      const { error: deleteTableError } = await admin
        .from(table)
        .delete()
        .eq("upload_id", uploadId)
        .eq("business_id", business.id);

      if (deleteTableError) {
        console.error(`Admin delete error for ${table}:`, deleteTableError);
        throw new Error(deleteTableError.message);
      }
    }

    console.log("Deleted parsed records");

    const { error: deleteUploadError } = await admin
      .from("uploads")
      .delete()
      .eq("id", uploadId)
      .eq("business_id", business.id);

    if (deleteUploadError) {
      console.error("Admin upload delete error:", deleteUploadError);
      throw new Error(deleteUploadError.message);
    }

    console.log("Deleted upload row");

    if (upload.file_name) {
      const storagePrefix = `${business.id}/${user.id}/`;
      const { data: storageObjects, error: storageError } = await admin
        .storage
        .from("business-uploads")
        .list(storagePrefix, { limit: 1000 });

      if (storageError) {
        console.error("Admin storage list error:", storageError);
        throw new Error(storageError.message);
      }

      if (Array.isArray(storageObjects) && storageObjects.length > 0) {
        const matchingFiles = storageObjects.filter((object) =>
          typeof object.name === "string" && object.name.endsWith(`-${upload.file_name}`)
        );

        if (matchingFiles.length > 0) {
          const pathsToRemove = matchingFiles.map((object) =>
            typeof object.name === "string" && object.name.startsWith(storagePrefix)
              ? object.name
              : `${storagePrefix}${object.name}`
          );

          const { error: removeError } = await admin.storage
            .from("business-uploads")
            .remove(pathsToRemove);

          if (removeError) {
            console.error("Admin storage delete error:", removeError);
            throw new Error(removeError.message);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete upload failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete upload",
      },
      { status: 500 }
    );
  }
}
