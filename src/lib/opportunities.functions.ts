import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RecommendationEnum = z.enum(["go", "hold", "no_go", "pending"]);
const StatusEnum = z.enum([
  "screening",
  "due_diligence",
  "negotiation",
  "closed",
  "passed",
]);

const ListFilters = z
  .object({
    q: z.string().max(200).optional(),
    status: StatusEnum.optional(),
    recommendation: RecommendationEnum.optional(),
  })
  .optional();

export type ListOpportunitiesInput = z.input<typeof ListFilters>;

export type OpportunityRow = {
  id: string;
  user_id: string;
  company_name: string;
  sector: string | null;
  stage: string | null;
  wilaya_code: number | null;
  ticket_size_dzd: number | null;
  valuation_dzd: number | null;
  revenue_dzd: number | null;
  ebitda_dzd: number | null;
  description: string | null;
  notes: string | null;
  score_financial: number | null;
  score_legal: number | null;
  score_market: number | null;
  score_risk: number | null;
  score_team: number | null;
  score_overall: number | null;
  recommendation: "go" | "hold" | "no_go" | "pending";
  status:
    | "screening"
    | "due_diligence"
    | "negotiation"
    | "closed"
    | "passed";
  created_at: string;
  updated_at: string;
};

export const listOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ListOpportunitiesInput) => ListFilters.parse(data) ?? {})
  .handler(async ({ data, context }): Promise<OpportunityRow[]> => {
    const { supabase, userId } = context;
    let qb = supabase
      .from("investment_opportunities")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (data?.status) qb = qb.eq("status", data.status);
    if (data?.recommendation) qb = qb.eq("recommendation", data.recommendation);
    if (data?.q && data.q.trim()) {
      const term = data.q.trim().replace(/[%_,]/g, " ");
      qb = qb.or(
        `company_name.ilike.%${term}%,sector.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }

    const { data: rows, error } = await qb;
    if (error) throw new Error(error.message);
    return (rows ?? []) as OpportunityRow[];
  });

export const getInvestorStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("investment_opportunities")
      .select("recommendation,status,score_overall,ticket_size_dzd")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const total = rows.length;
    const go = rows.filter((r) => r.recommendation === "go").length;
    const hold = rows.filter((r) => r.recommendation === "hold").length;
    const noGo = rows.filter((r) => r.recommendation === "no_go").length;
    const pending = rows.filter((r) => r.recommendation === "pending").length;
    const scored = rows
      .map((r) => Number(r.score_overall))
      .filter((n) => Number.isFinite(n));
    const avgScore =
      scored.length > 0
        ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) /
          10
        : null;
    const totalTicket = rows.reduce(
      (a, r) => a + (Number(r.ticket_size_dzd) || 0),
      0,
    );
    const byStatus = {
      screening: rows.filter((r) => r.status === "screening").length,
      due_diligence: rows.filter((r) => r.status === "due_diligence").length,
      negotiation: rows.filter((r) => r.status === "negotiation").length,
      closed: rows.filter((r) => r.status === "closed").length,
      passed: rows.filter((r) => r.status === "passed").length,
    };
    return { total, go, hold, noGo, pending, avgScore, totalTicket, byStatus };
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1).max(255),
  sector: z.string().max(120).nullable().optional(),
  stage: z.string().max(60).nullable().optional(),
  wilaya_code: z.number().int().min(1).max(58).nullable().optional(),
  ticket_size_dzd: z.number().nonnegative().nullable().optional(),
  valuation_dzd: z.number().nonnegative().nullable().optional(),
  revenue_dzd: z.number().nullable().optional(),
  ebitda_dzd: z.number().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  score_financial: z.number().int().min(0).max(100).nullable().optional(),
  score_legal: z.number().int().min(0).max(100).nullable().optional(),
  score_market: z.number().int().min(0).max(100).nullable().optional(),
  score_risk: z.number().int().min(0).max(100).nullable().optional(),
  score_team: z.number().int().min(0).max(100).nullable().optional(),
  recommendation: RecommendationEnum.default("pending"),
  status: StatusEnum.default("screening"),
});

export type UpsertOpportunityInput = z.input<typeof UpsertSchema>;

export const upsertOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpsertOpportunityInput) => UpsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, user_id: userId };
    const { data: row, error } = await supabase
      .from("investment_opportunities")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as OpportunityRow;
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("investment_opportunities")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
