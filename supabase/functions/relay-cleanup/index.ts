import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { cleanupRelayRows } from "./cleanup.js";

Deno.serve(async (request) => {
  const secret = Deno.env.get("RELAY_CLEANUP_TOKEN");
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!secret || request.headers.get("x-relay-cleanup-token") !== secret) {
    return new Response(null, { status: 401 });
  }

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const cutoff = now.toISOString();
  const retryBefore = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const columns = "id,user_id,status,tmp_path";
  const candidates = (status: string) => client.from("transfer_queue").select(columns)
    .eq("status", status).not("tmp_path", "is", null)
    .lt("updated_at", retryBefore).order("updated_at").order("id").limit(50);

  try {
    const results = await Promise.all([
      candidates("uploaded").lte("expires_at", cutoff),
      candidates("expired"),
      candidates("landed"),
    ]);
    for (const result of results) if (result.error) throw result.error;

    type Row = { id: string; user_id: string; tmp_path: string };
    const update = (row: Row, status: string, patch: Record<string, unknown>) => client.from("transfer_queue")
      .update(patch).eq("id", row.id).eq("user_id", row.user_id)
      .eq("tmp_path", row.tmp_path).eq("status", status);

    const result = await cleanupRelayRows(results.flatMap(({ data }) => data ?? []), {
      async claim(row: Row) {
        const { data, error } = await update(row, "uploaded", { status: "expired" })
          .lte("expires_at", cutoff).select("id").maybeSingle();
        if (error) throw error;
        return Boolean(data);
      },
      async remove(path: string) {
        const { error } = await client.storage.from("photos").remove([path]);
        if (error) throw error;
      },
      async finish(row: Row, status: string) {
        const { error } = await update(row, status, {
          status: status === "landed" ? "deleted" : "expired",
          tmp_path: null,
        });
        if (error) throw error;
      },
      async defer(row: Row, status: string) {
        await update(row, status, { updated_at: cutoff });
      },
    });
    return Response.json(result, { status: result.failed ? 500 : 200 });
  } catch {
    return Response.json({ error: "Relay cleanup failed" }, { status: 500 });
  }
});
