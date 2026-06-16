import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: msgs, error: e1 } = await context.supabase
      .from("chat_messages")
      .select("id")
      .eq("thread_id", data.threadId);
    if (e1) throw new Error(e1.message);
    const ids = (msgs ?? []).map((m) => m.id);
    if (ids.length === 0) return [];
    const { data: rows, error } = await context.supabase
      .from("message_feedback")
      .select("id,message_id,rating,comment,updated_at")
      .in("message_id", ids)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        rating: z.union([z.literal(1), z.literal(-1)]),
        comment: z.string().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("message_feedback")
      .upsert(
        {
          message_id: data.messageId,
          user_id: context.userId,
          rating: data.rating,
          comment: data.comment ?? null,
        },
        { onConflict: "message_id,user_id" },
      )
      .select("id,message_id,rating,comment,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("message_feedback")
      .delete()
      .eq("message_id", data.messageId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
