import { createClient } from "@/lib/supabase/server";

export default async function TestDbPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("businesses").select("*");

  return (
    <div className="p-10 text-white">
      <h1 className="mb-6 text-2xl font-bold">
        Supabase Connection Test
      </h1>

      {error && (
        <pre className="text-red-500">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <pre className="overflow-auto rounded-xl bg-zinc-900 p-4">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}