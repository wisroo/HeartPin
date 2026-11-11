import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { shouldSendOriginalArrival } from "./delivery.js";
import { createPushSender } from "./providers.ts";

type PushJob = {
  id: number;
  transfer_queue: { user_id: string; dest_owner: string; status: string; expires_at: string } | null;
  original_push_devices: { id: string; user_id: string; owner: string; platform: string; token: string } | null;
};

const send = createPushSender();

Deno.serve(async (request) => {
  const secret = Deno.env.get("ORIGINAL_PUSH_WORKER_TOKEN");
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!secret || request.headers.get("x-original-push-token") !== secret) {
    return new Response(null, { status: 401 });
  }

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: jobs, error } = await client.from("original_push_outbox").select("id")
    .lte("retry_at", now).order("retry_at").order("id").limit(20);
  if (error) return Response.json({ error: "Push queue lookup failed" }, { status: 500 });

  const results = await Promise.all((jobs ?? []).map(async ({ id }) => {
    try {
      // Only one invocation leases each job. An interrupted invocation is retried.
      const { data: job, error: claimError } = await client.from("original_push_outbox")
        .update({ retry_at: retryAt }).eq("id", id).lte("retry_at", now)
        .select("id,transfer_queue(user_id,dest_owner,status,expires_at),original_push_devices(id,user_id,owner,platform,token)")
        .maybeSingle().overrideTypes<PushJob, { merge: false }>();
      if (claimError) throw claimError;
      if (!job) return "skipped";
      const transfer = job.transfer_queue;
      const device = job.original_push_devices;
      if (shouldSendOriginalArrival(transfer, device, Date.now()) && transfer && device) {
        const result = await send(device, transfer.expires_at);
        if (result === "invalid") {
          const { error: removeError } = await client.from("original_push_devices")
            .delete().eq("id", device.id).eq("token", device.token);
          if (removeError) throw removeError;
        }
      }
      const { error: finishError } = await client.from("original_push_outbox").delete().eq("id", id);
      if (finishError) throw finishError;
      return "done";
    } catch {
      return "failed";
    }
  }));
  const failed = results.filter((result) => result === "failed").length;
  return Response.json({ processed: results.filter((result) => result === "done").length, failed }, { status: failed ? 500 : 200 });
});
