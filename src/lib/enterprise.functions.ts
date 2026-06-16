import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ COMPANY ============
const companySchema = z.object({
  legal_name: z.string().trim().min(1).max(200),
  trade_name: z.string().trim().max(200).optional().nullable(),
  nif: z.string().trim().max(50).optional().nullable(),
  nis: z.string().trim().max(50).optional().nullable(),
  rc: z.string().trim().max(50).optional().nullable(),
  ai: z.string().trim().max(50).optional().nullable(),
  sector: z.string().trim().max(100).optional().nullable(),
  stage: z.string().trim().max(50).optional().nullable(),
  wilaya_code: z.number().int().nullable().optional(),
  address: z.string().trim().max(500).optional().nullable(),
  founded_year: z.number().int().min(1900).max(2100).nullable().optional(),
  employees_count: z.number().int().min(0).max(1_000_000).nullable().optional(),
  website: z.string().trim().max(255).optional().nullable(),
  contact_email: z.string().trim().max(255).optional().nullable(),
  contact_phone: z.string().trim().max(50).optional().nullable(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const getCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("companies").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return { company: data };
  });

export const upsertCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => companySchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("companies").upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw new Error(error.message);
    return { company: row };
  });

// ============ FINANCIAL PERIODS ============
const periodSchema = z.object({
  id: z.string().uuid().optional(),
  period_label: z.string().trim().min(1).max(50),
  period_start: z.string(),
  period_end: z.string(),
  revenue_dzd: z.number().default(0),
  cogs_dzd: z.number().default(0),
  opex_dzd: z.number().default(0),
  ebitda_dzd: z.number().default(0),
  net_income_dzd: z.number().default(0),
  cash_dzd: z.number().default(0),
  assets_dzd: z.number().default(0),
  liabilities_dzd: z.number().default(0),
  equity_dzd: z.number().default(0),
  customers_count: z.number().int().default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const listPeriods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("financial_periods").select("*").eq("user_id", context.userId)
      .order("period_end", { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return { periods: data ?? [] };
  });

export const upsertPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => periodSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("financial_periods").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { period: row };
  });

export const deletePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_periods").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ RISK ============
const riskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional().nullable(),
  likelihood: z.enum(["low", "medium", "high", "critical"]),
  impact: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "mitigating", "closed"]).default("open"),
  mitigation: z.string().max(1000).optional().nullable(),
  owner: z.string().max(100).optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const listRisks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("risk_items").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { risks: data ?? [] };
  });

export const upsertRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => riskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("risk_items").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { risk: row };
  });

export const deleteRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("risk_items").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ AUDIT REPORTS ============
const auditSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  period_label: z.string().max(50).optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  findings: z.array(z.object({ severity: z.string(), text: z.string() })).default([]),
  score: z.number().int().min(0).max(100).nullable().optional(),
});

export const listAudits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_reports").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { audits: data ?? [] };
  });

export const upsertAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => auditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("audit_reports").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { audit: row };
  });

export const deleteAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("audit_reports").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ INVESTMENT ROUNDS ============
const roundSchema = z.object({
  id: z.string().uuid().optional(),
  round_name: z.string().trim().min(1).max(100),
  target_amount_dzd: z.number().nullable().optional(),
  raised_amount_dzd: z.number().default(0),
  pre_money_dzd: z.number().nullable().optional(),
  status: z.string().max(30).default("open"),
  open_date: z.string().optional().nullable(),
  close_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const listRounds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("investment_rounds").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rounds: data ?? [] };
  });

export const upsertRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => roundSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("investment_rounds").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { round: row };
  });

export const deleteRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("investment_rounds").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
