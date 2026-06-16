import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  calcG50,
  calcInvoiceTotals,
  calcPayrollLine,
  sanitizeG50Lines,
  type G50Input,
  type G50Result,
} from "@/lib/tax/calculations";
import { MOCK_G50_INPUT, MOCK_INVOICE, MOCK_PAYROLL } from "@/lib/tax/mock-data";
import { SCF_DEFAULT_ACCOUNTS } from "@/lib/tax/constants";

const TvaLineSchema = z.object({
  label: z.string().max(200),
  baseHt: z.number().min(0),
  rateKey: z.enum(["standard", "reduced", "exempt"]),
  type: z.enum(["collectee", "deductible"]),
});

const PayrollLineSchema = z.object({
  employeeName: z.string().min(1).max(120),
  matricule: z.string().max(50).optional(),
  grossSalary: z.number().min(0),
  daysWorked: z.number().int().min(0).max(31).optional(),
});

const G50InputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  tvaLines: z.array(TvaLineSchema).max(50),
  payrollLines: z.array(PayrollLineSchema).max(200),
  tapActivity: z.enum(["production", "services"]),
  tapBase: z.number().min(0),
  ibsRegime: z.enum(["standard", "production"]),
  ibsBase: z.number().min(0),
  previousIbsAnnual: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

const InvoiceLineSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  tvaRateKey: z.enum(["standard", "reduced", "exempt"]),
});

const InvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  invoice_number: z.string().min(1).max(50),
  invoice_date: z.string(),
  invoice_type: z.enum(["sale", "purchase"]).default("sale"),
  seller_name: z.string().min(1).max(200),
  seller_nif: z.string().max(50).optional().nullable(),
  seller_nis: z.string().max(50).optional().nullable(),
  seller_rc: z.string().max(50).optional().nullable(),
  seller_ai: z.string().max(50).optional().nullable(),
  seller_address: z.string().max(500).optional().nullable(),
  buyer_name: z.string().min(1).max(200),
  buyer_nif: z.string().max(50).optional().nullable(),
  buyer_address: z.string().max(500).optional().nullable(),
  lines: z.array(InvoiceLineSchema).min(1).max(50),
  notes: z.string().max(1000).optional().nullable(),
});

const PayrollSlipSchema = z.object({
  id: z.string().uuid().optional(),
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12),
  employee_name: z.string().min(1).max(120),
  matricule: z.string().max(50).optional().nullable(),
  job_title: z.string().max(120).optional().nullable(),
  hire_date: z.string().optional().nullable(),
  days_worked: z.number().int().min(0).max(31).default(26),
  gross_salary: z.number().min(0),
  employer_name: z.string().max(200).optional().nullable(),
  employer_nif: z.string().max(50).optional().nullable(),
  employer_address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const JournalLineSchema = z.object({
  account_code: z.string().min(1).max(20),
  label: z.string().max(200).optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

const JournalEntrySchema = z.object({
  id: z.string().uuid().optional(),
  entry_date: z.string(),
  reference: z.string().max(50).optional().nullable(),
  description: z.string().min(1).max(500),
  lines: z.array(JournalLineSchema).min(2).max(20),
});

export const computeG50 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const body = d as z.input<typeof G50InputSchema>;
    const cleaned = sanitizeG50Lines({
      tvaLines: body.tvaLines ?? [],
      payrollLines: body.payrollLines ?? [],
    });
    return G50InputSchema.parse({ ...body, ...cleaned });
  })
  .handler(async ({ data }) => {
    const input: G50Input = {
      year: data.year,
      month: data.month,
      tvaLines: data.tvaLines,
      payrollLines: data.payrollLines,
      tapActivity: data.tapActivity,
      tapBase: data.tapBase,
      ibsRegime: data.ibsRegime,
      ibsBase: data.ibsBase,
      previousIbsAnnual: data.previousIbsAnnual,
    };
    return { result: calcG50(input) as G50Result };
  });

export const listG50Declarations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("g50_declarations")
      .select("*")
      .eq("user_id", context.userId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(36);
    if (error) throw new Error(error.message);
    return { declarations: data ?? [] };
  });

export const getG50Declaration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number }) =>
    z.object({ year: z.number(), month: z.number() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("g50_declarations")
      .select("*")
      .eq("user_id", context.userId)
      .eq("period_year", data.year)
      .eq("period_month", data.month)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { declaration: row };
  });

export const saveG50Declaration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const body = d as z.input<typeof G50InputSchema>;
    const cleaned = sanitizeG50Lines({
      tvaLines: body.tvaLines ?? [],
      payrollLines: body.payrollLines ?? [],
    });
    return G50InputSchema.parse({ ...body, ...cleaned });
  })
  .handler(async ({ data, context }) => {
    const input: G50Input = {
      year: data.year,
      month: data.month,
      tvaLines: data.tvaLines,
      payrollLines: data.payrollLines,
      tapActivity: data.tapActivity,
      tapBase: data.tapBase,
      ibsRegime: data.ibsRegime,
      ibsBase: data.ibsBase,
      previousIbsAnnual: data.previousIbsAnnual,
    };
    const result = calcG50(input);
    const payload = {
      user_id: context.userId,
      period_year: data.year,
      period_month: data.month,
      status: "validated" as const,
      input_data: input,
      computed_data: result,
      total_due: result.totalDue,
      deadline_date: result.deadline,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("g50_declarations")
      .upsert(payload, { onConflict: "user_id,period_year,period_month" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { declaration: row, result };
  });

export const getMockG50Data = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const input = MOCK_G50_INPUT();
    return { input, result: calcG50(input) };
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tax_invoices")
      .select("*")
      .eq("user_id", context.userId)
      .order("invoice_date", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return { invoices: data ?? [] };
  });

export const upsertInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InvoiceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const totals = calcInvoiceTotals(data.lines);
    const payload = {
      ...data,
      user_id: context.userId,
      lines: data.lines,
      totals,
    };
    delete (payload as { id?: string }).id;
    let row;
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("tax_invoices")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("tax_invoices")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }
    return { invoice: row, totals };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tax_invoices")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMockInvoiceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ mock: MOCK_INVOICE }));

export const listPayrollSlips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payroll_slips")
      .select("*")
      .eq("user_id", context.userId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return { slips: data ?? [] };
  });

export const upsertPayrollSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PayrollSlipSchema.parse(d))
  .handler(async ({ data, context }) => {
    const computed = calcPayrollLine({
      employeeName: data.employee_name,
      matricule: data.matricule ?? undefined,
      grossSalary: data.gross_salary,
      daysWorked: data.days_worked,
    });
    const payload = {
      user_id: context.userId,
      period_year: data.period_year,
      period_month: data.period_month,
      employee_name: data.employee_name,
      matricule: data.matricule ?? null,
      job_title: data.job_title ?? null,
      hire_date: data.hire_date ?? null,
      days_worked: data.days_worked,
      gross_salary: computed.grossSalary,
      cnas_employee: computed.cnasEmployee,
      cnas_employer: computed.cnasEmployer,
      irg: computed.irg,
      net_salary: computed.netSalary,
      employer_name: data.employer_name ?? null,
      employer_nif: data.employer_nif ?? null,
      employer_address: data.employer_address ?? null,
      notes: data.notes ?? null,
    };
    let row;
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("payroll_slips")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("payroll_slips")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      row = inserted;
    }
    return { slip: row, computed };
  });

export const deletePayrollSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("payroll_slips")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMockPayrollData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ mock: MOCK_PAYROLL }));

export const initScfAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error: countErr } = await context.supabase
      .from("scf_accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) return { initialized: false, count: count ?? 0 };
    const rows = SCF_DEFAULT_ACCOUNTS.map((a) => ({
      user_id: context.userId,
      code: a.code,
      label: a.label,
      class_num: a.class,
      is_system: true,
    }));
    const { error } = await context.supabase.from("scf_accounts").insert(rows);
    if (error) throw new Error(error.message);
    return { initialized: true, count: rows.length };
  });

export const listScfAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scf_accounts")
      .select("*")
      .eq("user_id", context.userId)
      .order("code");
    if (error) throw new Error(error.message);
    return { accounts: data ?? [] };
  });

export const listJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scf_journal_entries")
      .select("*, scf_journal_lines(*)")
      .eq("user_id", context.userId)
      .order("entry_date", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });

export const upsertJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => JournalEntrySchema.parse(d))
  .handler(async ({ data, context }) => {
    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن");
    }
    const { data: entry, error: entryErr } = await context.supabase
      .from("scf_journal_entries")
      .insert({
        user_id: context.userId,
        entry_date: data.entry_date,
        reference: data.reference ?? null,
        description: data.description,
      })
      .select()
      .single();
    if (entryErr) throw new Error(entryErr.message);
    const lines = data.lines.map((l, i) => ({
      entry_id: entry.id,
      account_code: l.account_code,
      label: l.label ?? null,
      debit: l.debit,
      credit: l.credit,
      position: i,
    }));
    const { error: linesErr } = await context.supabase.from("scf_journal_lines").insert(lines);
    if (linesErr) throw new Error(linesErr.message);
    return { entry };
  });

export const getScfBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: lines, error } = await context.supabase
      .from("scf_journal_lines")
      .select("account_code, debit, credit, scf_journal_entries!inner(user_id)")
      .eq("scf_journal_entries.user_id", context.userId);
    if (error) throw new Error(error.message);
    const map = new Map<string, { debit: number; credit: number }>();
    for (const l of lines ?? []) {
      const cur = map.get(l.account_code) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debit);
      cur.credit += Number(l.credit);
      map.set(l.account_code, cur);
    }
    const balance = [...map.entries()].map(([code, v]) => ({
      account_code: code,
      debit: v.debit,
      credit: v.credit,
      balance: v.debit - v.credit,
    }));
    return { balance };
  });

export const searchLegalDocs = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string } | undefined) =>
    z.object({ q: z.string().max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { LEGAL_DOCUMENTS_MOCK } = await import("@/lib/tax/mock-data");
    const filterMock = () => {
      const needle = data.q?.trim().toLowerCase();
      if (!needle) return [...LEGAL_DOCUMENTS_MOCK];
      return LEGAL_DOCUMENTS_MOCK.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          d.content.toLowerCase().includes(needle) ||
          d.category.toLowerCase().includes(needle),
      );
    };

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      return { documents: filterMock(), source: "mock" as const };
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      let q = sb
        .from("tax_legal_documents")
        .select("id,title,category,year,content")
        .eq("is_published", true)
        .limit(20);
      if (data.q?.trim()) {
        const term = data.q.trim();
        q = q.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      }
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      if ((rows ?? []).length > 0) return { documents: rows ?? [], source: "database" as const };
    } catch (e) {
      console.error("[searchLegalDocs]", e);
    }

    return { documents: filterMock(), source: "mock" as const };
  });

export const shareOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { opportunityId: string; sharedWith: string; permission?: string }) =>
    z
      .object({
        opportunityId: z.string().uuid(),
        sharedWith: z.string().uuid(),
        permission: z.enum(["view", "edit"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: opp, error: oppErr } = await context.supabase
      .from("investment_opportunities")
      .select("id")
      .eq("id", data.opportunityId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (oppErr || !opp) throw new Error("الفرصة غير موجودة");
    const { data: row, error } = await context.supabase
      .from("opportunity_shares")
      .upsert(
        {
          opportunity_id: data.opportunityId,
          owner_id: context.userId,
          shared_with: data.sharedWith,
          permission: data.permission ?? "view",
        },
        { onConflict: "opportunity_id,shared_with" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("notifications").insert({
      user_id: data.sharedWith,
      title: "مشاركة فرصة استثمار",
      body: "تمت مشاركة فرصة استثمار معك",
      link: "/dashboard/evaluation",
    });
    return { share: row };
  });

export const exportOpportunityPdfData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: opp, error } = await context.supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !opp) throw new Error("الفرصة غير موجودة");
    return { opportunity: opp };
  });

export const analyzeOpportunityWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: opp, error } = await context.supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !opp) throw new Error("الفرصة غير موجودة");
    const summary = [
      `شركة: ${opp.company_name}`,
      `القطاع: ${opp.sector ?? "—"}`,
      `المرحلة: ${opp.stage ?? "—"}`,
      `حجم الصفقة: ${opp.ticket_size_dzd ?? "—"} DZD`,
      `التقييم: ${opp.valuation_dzd ?? "—"} DZD`,
      `الدرجة الكلية: ${opp.score_overall ?? "—"}/100`,
      `التوصية: ${opp.recommendation}`,
      `الوصف: ${opp.description ?? ""}`,
    ].join("\n");
    const { data: thread, error: threadErr } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: `تحليل: ${opp.company_name}` })
      .select()
      .single();
    if (threadErr) throw new Error(threadErr.message);
    await context.supabase.from("chat_messages").insert({
      thread_id: thread.id,
      user_id: context.userId,
      role: "user",
      parts: [
        {
          type: "text",
          text: `حلّل فرصة الاستثمار التالية وقدّم تقييماً مالياً وقانونياً:\n\n${summary}`,
        },
      ] as never,
    });
    return { threadId: thread.id };
  });

export const calcAnnualTax = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        revenue: z.number().min(0),
        expenses: z.number().min(0),
        ibsRegime: z.enum(["standard", "production"]),
        tapActivity: z.enum(["production", "services"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const profit = Math.max(0, data.revenue - data.expenses);
    const ibsRate = data.ibsRegime === "production" ? 0.19 : 0.26;
    const tapRate = data.tapActivity === "production" ? 0.015 : 0.02;
    return {
      profit,
      ibs: Math.round(profit * ibsRate * 100) / 100,
      tap: Math.round(data.revenue * tapRate * 100) / 100,
      ibsRate,
      tapRate,
    };
  });
