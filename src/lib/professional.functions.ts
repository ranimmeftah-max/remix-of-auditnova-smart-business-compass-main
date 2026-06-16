import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ CLIENTS ============
const clientSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).nullable().optional(),
  email: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  sector: z.string().trim().max(100).nullable().optional(),
  wilaya_code: z.number().int().nullable().optional(),
  status: z.enum(["active", "prospect", "inactive"]).default("active"),
  notes: z.string().max(2000).nullable().optional(),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_clients").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { clients: data ?? [] };
  });

export const upsertClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => clientSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await (context.supabase as any)
      .from("pro_clients").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { client: row };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("pro_clients").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ENGAGEMENTS ============
const engagementSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  engagement_type: z.string().trim().max(100).nullable().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  fee_dzd: z.number().nullable().optional(),
  progress: z.number().int().min(0).max(100).default(0),
  description: z.string().max(2000).nullable().optional(),
});

export const listEngagements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_engagements").select("*, pro_clients(full_name, company)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { engagements: data ?? [] };
  });

export const upsertEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => engagementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await (context.supabase as any)
      .from("pro_engagements").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { engagement: row };
  });

export const deleteEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("pro_engagements").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ANALYSES ============
const analysisSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  analysis_type: z.string().trim().max(100).nullable().optional(),
  score: z.number().nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  data: z.record(z.string(), z.any()).default({}),
});

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_analyses").select("*, pro_clients(full_name)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { analyses: data ?? [] };
  });

export const upsertAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => analysisSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await (context.supabase as any)
      .from("pro_analyses").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { analysis: row };
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("pro_analyses").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ COMPLIANCE ============
const complianceSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  framework: z.string().trim().min(1).max(100),
  item: z.string().trim().min(1).max(300),
  status: z.enum(["pending", "compliant", "non_compliant", "not_applicable"]).default("pending"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  notes: z.string().max(2000).nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
});

export const listCompliance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_compliance_checks").select("*, pro_clients(full_name)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { checks: data ?? [] };
  });

export const upsertCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => complianceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await (context.supabase as any)
      .from("pro_compliance_checks").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { check: row };
  });

export const deleteCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("pro_compliance_checks").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ APPOINTMENTS ============
const appointmentSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().min(5).max(1440).default(60),
  location: z.string().max(255).nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().max(2000).nullable().optional(),
});

export const listAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("pro_appointments").select("*, pro_clients(full_name, company)")
      .eq("user_id", context.userId).order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { appointments: data ?? [] };
  });

export const upsertAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => appointmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: row, error } = await (context.supabase as any)
      .from("pro_appointments").upsert(payload).select().single();
    if (error) throw new Error(error.message);
    return { appointment: row };
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("pro_appointments").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
