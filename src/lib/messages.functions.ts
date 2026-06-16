import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** قائمة المحادثات: لكل مستخدم آخر، آخر رسالة وعدد غير المقروء. */
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = context.userId;
    const { data: rows, error } = await context.supabase
      .from("direct_messages")
      .select("id,sender_id,recipient_id,body,read_at,created_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const byPeer = new Map<
      string,
      { peer_id: string; last_body: string; last_at: string; unread: number }
    >();
    for (const r of rows ?? []) {
      const peer = r.sender_id === me ? r.recipient_id : r.sender_id;
      const isIncomingUnread = r.recipient_id === me && !r.read_at;
      const cur = byPeer.get(peer);
      if (!cur) {
        byPeer.set(peer, {
          peer_id: peer,
          last_body: r.body,
          last_at: r.created_at,
          unread: isIncomingUnread ? 1 : 0,
        });
      } else if (isIncomingUnread) {
        cur.unread += 1;
      }
    }

    const peers = Array.from(byPeer.keys());
    let profiles: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
    if (peers.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", peers);
      profiles = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { first_name: p.first_name, last_name: p.last_name, email: p.email }]),
      );
    }
    return Array.from(byPeer.values())
      .map((c) => ({ ...c, profile: profiles[c.peer_id] ?? null }))
      .sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        peerId: z.string().uuid(),
        before: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const me = context.userId;
    const limit = data.limit ?? 30;
    let q = context.supabase
      .from("direct_messages")
      .select("id,sender_id,recipient_id,body,read_at,created_at")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${data.peerId}),and(sender_id.eq.${data.peerId},recipient_id.eq.${me})`,
      )
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const fetched = rows ?? [];
    const hasMore = fetched.length > limit;
    const page = (hasMore ? fetched.slice(0, limit) : fetched).slice().reverse();

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id,first_name,last_name,email,last_seen_at")
      .eq("id", data.peerId)
      .maybeSingle();
    return {
      messages: page,
      peer: prof ?? null,
      hasMore,
      nextCursor: hasMore && page.length > 0 ? page[0].created_at : null,
    };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ recipientId: z.string().uuid(), body: z.string().min(1).max(5000) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    if (data.recipientId === context.userId) throw new Error("لا يمكنك مراسلة نفسك");
    const { data: row, error } = await context.supabase
      .from("direct_messages")
      .insert({
        sender_id: context.userId,
        recipient_id: data.recipientId,
        body: data.body.trim(),
      })
      .select("id,sender_id,recipient_id,body,read_at,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const markThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ peerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", context.userId)
      .eq("sender_id", data.peerId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("direct_messages")
      .delete()
      .eq("id", data.id)
      .eq("sender_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** البحث عن مستخدمين لبدء محادثة جديدة.
 *  Uses the admin client because the `profiles` table only allows reading
 *  rows of users you've already exchanged DMs with. Search must discover new
 *  peers, so we explicitly project to a safe subset (no email/phone). */
export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ context, data }) => {
    const q = `%${data.q.trim()}%`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id,first_name,last_name")
      .or(`first_name.ilike.${q},last_name.ilike.${q}`)
      .neq("id", context.userId)
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
