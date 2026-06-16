import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireSmeAccount } from "@/lib/enterprise-access";
import { z } from "zod";

const smeAuth = [requireSupabaseAuth, requireSmeAccount] as const;

export const smeServiceIds = [
  "ai-audit",
  "risk",
  "kpi",
  "internal-control",
  "legal-compliance",
  "ai-assistant",
] as const;

export type SmeServiceId = (typeof smeServiceIds)[number];

export const CONTROL_QUESTION_IDS = [
  "segregation",
  "authorization",
  "inventory",
  "reconciliation",
  "payroll",
  "purchases",
  "it_access",
  "documentation",
] as const;

function throwIfSmeDbError(error: { message: string } | null): void {
  if (!error) return;
  if (
    error.message.includes("sme_compliance_obligations") ||
    error.message.includes("sme_control_assessments")
  ) {
    throw new Error("طبّق migration sme_services على Supabase ثم أعد المحاولة");
  }
  throw new Error(error.message);
}

async function loadContext(supabase: { from: (t: string) => any }, userId: string) {
  const [{ data: company }, { data: periods }, { data: risks }, { data: audits }] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("financial_periods")
      .select("*")
      .eq("user_id", userId)
      .order("period_end", { ascending: false })
      .limit(12),
    supabase.from("risk_items").select("*").eq("user_id", userId).limit(50),
    supabase
      .from("audit_reports")
      .select("id,title,score,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  return {
    company,
    periods: periods ?? [],
    risks: risks ?? [],
    audits: audits ?? [],
  };
}

function nextDueDate(dueDay: number, frequency: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = Math.min(dueDay, 28);
  let due = new Date(y, m, day);
  if (due <= now) {
    if (frequency === "monthly") due = new Date(y, m + 1, day);
    else if (frequency === "quarterly") due = new Date(y, m + 3, day);
    else due = new Date(y + 1, 0, day);
  }
  return due.toISOString().slice(0, 10);
}

const DEFAULT_OBLIGATIONS = [
  { title: "تصريح G50 الشهري", category: "tax", frequency: "monthly", due_day: 20 },
  { title: "CNAS — الاشتراكات الاجتماعية", category: "social", frequency: "monthly", due_day: 15 },
  { title: "CASNOS — التأمين الذاتي", category: "social", frequency: "monthly", due_day: 15 },
  { title: "Bilan fiscal السنوي", category: "tax", frequency: "annual", due_day: 30 },
  { title: "DAS — تصريح المرتبات السنوي", category: "tax", frequency: "annual", due_day: 31 },
  { title: "G4 — تصريح TVA", category: "tax", frequency: "monthly", due_day: 20 },
  { title: "تجديد السجل التجاري", category: "legal", frequency: "annual", due_day: 31 },
  { title: "مراجعة عقود الموردين", category: "legal", frequency: "quarterly", due_day: 10 },
];

function computeKpiMetrics(periods: Array<Record<string, unknown>>, employees: number | null) {
  const sorted = [...periods].sort((a, b) =>
    String(a.period_end).localeCompare(String(b.period_end)),
  );
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return { hasData: false, profitability: null, liquidity: null, debt: null, productivity: null, chart: [] };
  }
  const rev = Number(latest.revenue_dzd) || 0;
  const cogs = Number(latest.cogs_dzd) || 0;
  const opex = Number(latest.opex_dzd) || 0;
  const ebitda = Number(latest.ebitda_dzd) || 0;
  const net = Number(latest.net_income_dzd) || 0;
  const cash = Number(latest.cash_dzd) || 0;
  const assets = Number(latest.assets_dzd) || 0;
  const liabilities = Number(latest.liabilities_dzd) || 0;
  const equity = Number(latest.equity_dzd) || 0;
  const customers = Number(latest.customers_count) || 0;
  const emp = employees ?? 0;

  const chart = sorted.slice(-12).map((p) => ({
    label: String(p.period_label ?? ""),
    revenue: Number(p.revenue_dzd) || 0,
    netMargin:
      (Number(p.net_income_dzd) || 0) / Math.max(Number(p.revenue_dzd) || 0, 1) * 100,
    cash: Number(p.cash_dzd) || 0,
  }));

  return {
    hasData: true,
    profitability: {
      grossMargin: rev > 0 ? Math.round(((rev - cogs) / rev) * 1000) / 10 : null,
      ebitdaMargin: rev > 0 ? Math.round((ebitda / rev) * 1000) / 10 : null,
      netMargin: rev > 0 ? Math.round((net / rev) * 1000) / 10 : null,
      netIncome: net,
    },
    liquidity: {
      cash,
      cashRatio: liabilities > 0 ? Math.round((cash / liabilities) * 1000) / 10 : null,
      monthlyOpex: Math.round(opex / 12),
      runwayMonths: opex > 0 ? Math.round((cash / (opex / 12)) * 10) / 10 : null,
    },
    debt: {
      debtRatio: assets > 0 ? Math.round((liabilities / assets) * 1000) / 10 : null,
      equityRatio: assets > 0 ? Math.round((equity / assets) * 1000) / 10 : null,
      liabilities,
      equity,
    },
    productivity: {
      revenuePerEmployee: emp > 0 ? Math.round(rev / emp) : null,
      revenuePerCustomer: customers > 0 ? Math.round(rev / customers) : null,
      customers,
      employees: emp,
    },
    chart,
  };
}

function smeRiskAlerts(
  periods: Array<Record<string, unknown>>,
  risks: Array<Record<string, unknown>>,
) {
  const alerts: Array<{ level: string; category: string; title: string; body: string }> = [];
  const sorted = [...periods].sort((a, b) =>
    String(a.period_end).localeCompare(String(b.period_end)),
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  if (latest) {
    const cash = Number(latest.cash_dzd) || 0;
    const opex = Number(latest.opex_dzd) || 0;
    const rev = Number(latest.revenue_dzd) || 0;
    const liabilities = Number(latest.liabilities_dzd) || 0;
    const cogs = Number(latest.cogs_dzd) || 0;
    const monthlyBurn = opex / 12;

    if (monthlyBurn > 0 && cash / monthlyBurn < 3) {
      alerts.push({
        level: "critical",
        category: "liquidity",
        title: "خطر سيولة حاد",
        body: `النقدية تغطي أقل من 3 أشهر من المصاريف (${(cash / monthlyBurn).toFixed(1)} شهر).`,
      });
    } else if (monthlyBurn > 0 && cash / monthlyBurn < 6) {
      alerts.push({
        level: "warning",
        category: "liquidity",
        title: "ضغط على السيولة",
        body: `Runway أقل من 6 أشهر — راقب التحصيل والمصاريف.`,
      });
    }

    if (prev) {
      const prevRev = Number(prev.revenue_dzd) || 0;
      if (prevRev > 0 && rev < prevRev * 0.9) {
        alerts.push({
          level: "warning",
          category: "collection",
          title: "تراجع الإيرادات",
          body: `انخفاض ${Math.round(((prevRev - rev) / prevRev) * 100)}% — قد يشير لمشاكل تحصيل أو مبيعات.`,
        });
      }
    }

    if (rev > 0 && liabilities / Math.max(rev, 1) > 1.5) {
      alerts.push({
        level: "warning",
        category: "collection",
        title: "مديونية مرتفعة مقابل المبيعات",
        body: "نسبة الخصوم إلى الإيرادات مرتفعة — راجع ذمم العملاء والتحصيل.",
      });
    }

    if (prev) {
      const prevCogs = Number(prev.cogs_dzd) || 0;
      if (prevCogs > 0 && cogs > prevCogs * 1.25) {
        alerts.push({
          level: "warning",
          category: "suppliers",
          title: "ارتفاع تكلفة الموردين",
          body: "COGS تجاوزت الفترة السابقة بأكثر من 25% — راجع عقود الموردين.",
        });
      }
    }

    const supplierRisks = risks.filter(
      (r) =>
        (r.status === "open" || r.status === "mitigating") &&
        String(r.category ?? "").toLowerCase().includes("supplier"),
    );
    if (supplierRisks.length >= 2) {
      alerts.push({
        level: "warning",
        category: "suppliers",
        title: "مخاطر موردين مفتوحة",
        body: `${supplierRisks.length} مخاطر مرتبطة بالموردين تحتاج معالجة.`,
      });
    }
  }

  const openCritical = risks.filter(
    (r) =>
      (r.status === "open" || r.status === "mitigating") &&
      (r.likelihood === "critical" || r.likelihood === "high" || r.impact === "critical" || r.impact === "high"),
  );
  if (openCritical.length >= 3) {
    alerts.push({
      level: "critical",
      category: "liquidity",
      title: "تراكم مخاطر عالية",
      body: `${openCritical.length} مخاطر عالية التأثير لم تُغلق بعد.`,
    });
  }

  return alerts;
}

function groupRisksByCategory(risks: Array<Record<string, unknown>>) {
  const cats = { liquidity: [] as typeof risks, collection: [] as typeof risks, suppliers: [] as typeof risks, other: [] as typeof risks };
  for (const r of risks) {
    const c = String(r.category ?? "").toLowerCase();
    if (c.includes("liquid") || c.includes("cash") || c.includes("سيولة")) cats.liquidity.push(r);
    else if (c.includes("collect") || c.includes("client") || c.includes("تحصيل")) cats.collection.push(r);
    else if (c.includes("supplier") || c.includes("vendor") || c.includes("مورد")) cats.suppliers.push(r);
    else cats.other.push(r);
  }
  return cats;
}

export const getSmeOverview = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    const alerts = smeRiskAlerts(ctx.periods, ctx.risks);
    const kpis = computeKpiMetrics(
      ctx.periods,
      ctx.company?.employees_count != null ? Number(ctx.company.employees_count) : null,
    );

    let dueObligations = 0;
    const { count, error: oblErr } = await supabase
      .from("sme_compliance_obligations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["pending", "overdue"]);
    if (!oblErr) dueObligations = count ?? 0;

    let controlScore: number | null = null;
    const { data: latestControl, error: ctrlErr } = await supabase
      .from("sme_control_assessments")
      .select("total_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ctrlErr && latestControl) controlScore = latestControl.total_score;

    return {
      auditCount: ctx.audits.length,
      riskAlertCount: alerts.length,
      dueObligations,
      controlScore,
      netMargin: kpis.profitability?.netMargin ?? null,
      hasCompany: !!ctx.company,
      hasFinancialData: kpis.hasData,
    };
  });

export const listSmeAudits = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_reports")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { audits: data ?? [] };
  });

export const runAiAudit = createServerFn({ method: "POST" })
  .middleware([...smeAuth])
  .inputValidator((d) =>
    z
      .object({
        documentContent: z.string().trim().min(20).max(50000),
        periodLabel: z.string().trim().max(50).optional(),
        title: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { company } = await loadContext(supabase, userId);

    const auditSchema = z.object({
      summary: z.string(),
      score: z.number().int().min(0).max(100),
      findings: z
        .array(
          z.object({
            severity: z.enum(["info", "warning", "critical"]),
            text: z.string(),
          }),
        )
        .min(2)
        .max(15),
      risks: z.array(z.string()).max(8),
      recommendations: z.array(z.string()).min(2).max(10),
    });

    let report: z.infer<typeof auditSchema>;
    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { object } = await generateObject({
        model,
        schema: auditSchema,
        prompt: `أنت مدقق محاسبي خبير في الجزائر. حلّل الوثائق المحاسبية التالية لمؤسسة SME:
الاسم: ${company?.legal_name ?? "غير محدد"}، القطاع: ${company?.sector ?? "—"}، الفترة: ${data.periodLabel ?? "غير محددة"}.

الوثائق:
${data.documentContent.slice(0, 12000)}

اكتشف الأخطاء والمخاطر المحاسبية والجبائية. أعطِ ملخصاً ودرجة من 100 وملاحظات وتوصيات بالعربية.`,
      });
      report = object;
    } catch {
      report = {
        summary: "تعذّر الاتصال بنموذج الذكاء الاصطناعي. راجع الوثائق يدوياً أو أعد المحاولة.",
        score: 50,
        findings: [
          { severity: "warning", text: "لم يكتمل التحليل الآلي — تحقق من اتصال AI." },
          { severity: "info", text: "راجع التوازنات والقيود اليومية يدوياً." },
        ],
        risks: ["عدم اكتمال التدقيق الآلي"],
        recommendations: ["أعد المحاولة لاحقاً", "استشر محاسباً معتمداً"],
      };
    }

    const title = data.title ?? `تدقيق ذكي — ${data.periodLabel ?? new Date().toISOString().slice(0, 10)}`;
    const payload = {
      user_id: userId,
      title,
      period_label: data.periodLabel ?? null,
      summary: report.summary,
      findings: report.findings,
      score: report.score,
    };
    const { data: row, error } = await supabase.from("audit_reports").insert(payload).select().single();
    if (error) throw new Error(error.message);

    return {
      audit: row,
      risks: report.risks,
      recommendations: report.recommendations,
    };
  });

export const getSmeRiskDashboard = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const alerts = smeRiskAlerts(ctx.periods, ctx.risks);
    const grouped = groupRisksByCategory(ctx.risks.filter((r) => r.status !== "closed"));
    return { alerts, grouped, risks: ctx.risks };
  });

export const getSmeKpiDashboard = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const employees =
      ctx.company?.employees_count != null ? Number(ctx.company.employees_count) : null;
    return { metrics: computeKpiMetrics(ctx.periods, employees), periods: ctx.periods };
  });

export const getLatestControlAssessment = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sme_control_assessments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error?.message.includes("sme_control_assessments")) return { assessment: null };
    throwIfSmeDbError(error);
    return { assessment: data };
  });

const controlScoresSchema = z.record(z.string(), z.number().int().min(1).max(5));

export const runInternalControlAssessment = createServerFn({ method: "POST" })
  .middleware([...smeAuth])
  .inputValidator((d) =>
    z.object({ scores: controlScoresSchema, notes: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { company } = await loadContext(supabase, userId);
    const values = CONTROL_QUESTION_IDS.map((id) => data.scores[id] ?? 3);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const totalScore = Math.round((avg / 5) * 100);

    const reportSchema = z.object({
      diagnosis: z.string(),
      strengths: z.array(z.string()).min(2).max(6),
      weaknesses: z.array(z.string()).min(2).max(6),
      actionPlan: z.array(z.string()).min(3).max(8),
    });

    let report: z.infer<typeof reportSchema> & { dimensions?: Array<{ id: string; score: number }> };
    const dimensions = CONTROL_QUESTION_IDS.map((id, i) => ({
      id,
      score: values[i] * 20,
    }));

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const scoresText = CONTROL_QUESTION_IDS.map(
        (id, i) => `${id}: ${values[i]}/5`,
      ).join("، ");
      const { object } = await generateObject({
        model,
        schema: reportSchema,
        prompt: `أنت خبير رقابة داخلية لمؤسسة SME جزائرية.
الدرجات (1-5): ${scoresText}.
المؤسسة: ${company?.legal_name ?? "—"}، الموظفون: ${company?.employees_count ?? "—"}.
ملاحظات: ${data.notes ?? "لا توجد"}.
قيّم الرقابة الداخلية واستخرج نقاط القوة والضعف وخطة تحسين بالعربية.`,
      });
      report = { ...object, dimensions };
    } catch {
      report = {
        diagnosis: `درجة الرقابة الداخلية ${totalScore}/100 — ${totalScore >= 70 ? "مستوى مقبول" : "يحتاج تحسين"}.`,
        strengths: ["وجود إجراءات أساسية", "وعي إداري بالرقابة"],
        weaknesses: ["فصل المهام غير مكتمل", "توثيق الإجراءات ضعيف"],
        actionPlan: [
          "توثيق مصفوفة الصلاحيات",
          "مراجعة دورية للمخزون والبنك",
          "تدريب الموظفين على الإجراءات",
        ],
        dimensions,
      };
    }

    const { data: row, error } = await supabase
      .from("sme_control_assessments")
      .insert({
        user_id: userId,
        scores: data.scores,
        report,
        total_score: totalScore,
      })
      .select()
      .single();
    throwIfSmeDbError(error);
    if (error) throw new Error(error.message);

    return { assessment: row, totalScore, report };
  });

export const listSmeObligations = createServerFn({ method: "GET" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sme_compliance_obligations")
      .select("*")
      .eq("user_id", context.userId)
      .order("next_due_date", { ascending: true });
    if (error?.message.includes("sme_compliance_obligations")) return { obligations: [] };
    throwIfSmeDbError(error);
    return { obligations: data ?? [] };
  });

export const seedSmeObligations = createServerFn({ method: "POST" })
  .middleware([...smeAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("sme_compliance_obligations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) > 0) return { ok: true, seeded: false };

    const rows = DEFAULT_OBLIGATIONS.map((o) => ({
      user_id: userId,
      title: o.title,
      category: o.category,
      frequency: o.frequency,
      due_day: o.due_day,
      next_due_date: nextDueDate(o.due_day, o.frequency),
      status: "pending",
    }));
    const { error } = await supabase.from("sme_compliance_obligations").insert(rows);
    throwIfSmeDbError(error);
    if (error) throw new Error(error.message);
    return { ok: true, seeded: true, count: rows.length };
  });

export const updateSmeObligation = createServerFn({ method: "POST" })
  .middleware([...smeAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "done", "overdue"]).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await context.supabase
      .from("sme_compliance_obligations")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    throwIfSmeDbError(error);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const askSmeAssistant = createServerFn({ method: "POST" })
  .middleware([...smeAuth])
  .inputValidator((d) => z.object({ question: z.string().trim().min(3).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const kpis = computeKpiMetrics(
      ctx.periods,
      ctx.company?.employees_count != null ? Number(ctx.company.employees_count) : null,
    );
    const alerts = smeRiskAlerts(ctx.periods, ctx.risks);

    const contextBlock = `
المؤسسة: ${ctx.company?.legal_name ?? "غير محددة"}
القطاع: ${ctx.company?.sector ?? "—"}
هامش صافي: ${kpis.profitability?.netMargin ?? "—"}%
Runway: ${kpis.liquidity?.runwayMonths ?? "—"} شهر
تنبيهات مخاطر: ${alerts.length}
`;

    try {
      const { generateText } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { text } = await generateText({
        model,
        prompt: `أنت مساعد ذكي للمسير (SME) في الجزائر. أجب بالعربية بشكل عملي ومختصر.
${contextBlock}

سؤال المسير: ${data.question}

اشرح المؤشرات إن لزم واقترح حلولاً لتحسين الأداء وتقليل المخاطر.`,
      });
      return { answer: text };
    } catch {
      return {
        answer:
          "تعذّر الاتصال بالمساعد الذكي. تحقق من إعدادات AI أو أعد المحاولة. يمكنك مراجعة لوحة KPI والمخاطر يدوياً.",
      };
    }
  });
