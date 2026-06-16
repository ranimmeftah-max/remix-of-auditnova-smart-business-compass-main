import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type EvaluationStats = {
  totalMessages: number;
  totalFeedback: number;
  positive: number;
  negative: number;
  withComments: number;
  satisfaction: number | null;
  byDay: { date: string; positive: number; negative: number }[];
};

export type FeedbackRow = {
  id: string;
  rating: 1 | -1;
  comment: string | null;
  updated_at: string;
  message_id: string;
  thread_id: string;
  thread_title: string;
  message_snippet: string;
};

const FiltersSchema = z
  .object({
    from: z.string().datetime().optional().nullable(),
    to: z.string().datetime().optional().nullable(),
    q: z.string().max(200).optional().nullable(),
    rating: z.enum(["all", "positive", "negative", "commented"]).optional().nullable(),
  })
  .optional();

type Filters = z.infer<typeof FiltersSchema>;

function snippetFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  const text = parts
    .filter((p): p is { type: string; text?: string } => !!p && typeof p === "object")
    .map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

function applyDateRange<T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
  q: T,
  f: Filters,
): T {
  let out = q;
  if (f?.from) out = out.gte("updated_at", f.from);
  if (f?.to) out = out.lte("updated_at", f.to);
  return out;
}

export const getEvaluationStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input))
  .handler(async ({ context, data: f }): Promise<EvaluationStats> => {
    const { supabase, userId } = context;

    let q = supabase
      .from("message_feedback")
      .select("rating,comment,updated_at")
      .eq("user_id", userId);
    q = applyDateRange(q, f);
    const { data: feedback, error } = await q;
    if (error) throw new Error(error.message);

    const { count: msgCount } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "assistant");

    const rows = feedback ?? [];
    const positive = rows.filter((r) => r.rating === 1).length;
    const negative = rows.filter((r) => r.rating === -1).length;
    const withComments = rows.filter((r) => (r.comment ?? "").trim().length > 0).length;
    const total = rows.length;
    const satisfaction = total > 0 ? Math.round((positive / total) * 100) : null;

    const days = new Map<string, { positive: number; negative: number }>();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.set(d.toISOString().slice(0, 10), { positive: 0, negative: 0 });
    }
    for (const r of rows) {
      const key = new Date(r.updated_at).toISOString().slice(0, 10);
      const slot = days.get(key);
      if (!slot) continue;
      if (r.rating === 1) slot.positive += 1;
      else if (r.rating === -1) slot.negative += 1;
    }
    const byDay = Array.from(days.entries()).map(([date, v]) => ({ date, ...v }));

    return {
      totalMessages: msgCount ?? 0,
      totalFeedback: total,
      positive,
      negative,
      withComments,
      satisfaction,
      byDay,
    };
  });

export const listRecentFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input))
  .handler(async ({ context, data: f }): Promise<FeedbackRow[]> => {
    const { supabase, userId } = context;

    let query = supabase
      .from("message_feedback")
      .select(
        "id,rating,comment,updated_at,message_id,chat_messages!inner(thread_id,parts,chat_threads!inner(title))",
      )
      .eq("user_id", userId);

    if (f?.rating === "positive") query = query.eq("rating", 1);
    if (f?.rating === "negative") query = query.eq("rating", -1);
    if (f?.rating === "commented") query = query.not("comment", "is", null);
    query = applyDateRange(query, f);
    query = query.order("updated_at", { ascending: false }).limit(200);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    type Joined = {
      id: string;
      rating: number;
      comment: string | null;
      updated_at: string;
      message_id: string;
      chat_messages: {
        thread_id: string;
        parts: unknown;
        chat_threads: { title: string } | { title: string }[];
      } | null;
    };

    const mapped: FeedbackRow[] = ((data ?? []) as unknown as Joined[]).map((r) => {
      const msg = r.chat_messages;
      const thread = Array.isArray(msg?.chat_threads) ? msg?.chat_threads[0] : msg?.chat_threads;
      return {
        id: r.id,
        rating: (r.rating === 1 ? 1 : -1) as 1 | -1,
        comment: r.comment,
        updated_at: r.updated_at,
        message_id: r.message_id,
        thread_id: msg?.thread_id ?? "",
        thread_title: thread?.title ?? "محادثة",
        message_snippet: snippetFromParts(msg?.parts),
      };
    });

    const q = (f?.q ?? "").trim().toLowerCase();
    const filtered = q
      ? mapped.filter(
          (r) =>
            r.message_snippet.toLowerCase().includes(q) ||
            (r.comment ?? "").toLowerCase().includes(q) ||
            r.thread_title.toLowerCase().includes(q),
        )
      : mapped;

    return filtered.slice(0, 50);
  });
