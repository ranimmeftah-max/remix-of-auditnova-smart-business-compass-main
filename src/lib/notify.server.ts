import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type NotifyInput = {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  type?: "info" | "success" | "warning" | "error";
};

export async function notifyUser(
  supabase: SupabaseClient<Database>,
  input: NotifyInput,
): Promise<void> {
  const payload = {
    p_user_id: input.userId,
    p_title: input.title,
    p_body: input.body ?? null,
    p_link: input.link ?? null,
    p_type: input.type ?? "info",
  };

  const { error: rpcErr } = await supabase.rpc("notify_user", payload);
  if (!rpcErr) return;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: adminErr } = await supabaseAdmin.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      type: input.type ?? "info",
    });
    if (!adminErr) return;
    console.error("[notifyUser] rpc:", rpcErr.message, "admin:", adminErr.message);
  } catch (e) {
    console.error("[notifyUser] rpc:", rpcErr.message, "admin:", e);
  }

  throw new Error("تعذّر إرسال الإشعار — طبّق migration notify_user_rpc على قاعدة البيانات");
}
