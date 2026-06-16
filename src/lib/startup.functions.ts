import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStartupAccount } from "@/lib/enterprise-access";
import { z } from "zod";
import { BMC_GENERATION_PROMPT, bmcBlocksSchema } from "@/lib/bmc";

const startupAuth = [requireSupabaseAuth, requireStartupAccount] as const;

const assessmentKind = z.enum(["readiness", "investor", "label1275"]);

function throwIfStartupDbError(error: { message: string } | null): void {
  if (!error) return;
  if (
    error.message.includes("startup_assessments") ||
    error.message.includes("startup_compliance") ||
    error.message.includes("startup_works")
  ) {
    throw new Error("طبّق migration startup_services على Supabase ثم أعد المحاولة");
  }
  throw new Error(error.message);
}

export const startupWorkModuleIds = ["bmc"] as const;
export type StartupWorkModuleId = (typeof startupWorkModuleIds)[number];

const startupWorkModuleSchema = z.enum(startupWorkModuleIds);

const STARTUP_WORK_PROMPTS: Record<StartupWorkModuleId, string> = {
  bmc: BMC_GENERATION_PROMPT,
};

async function loadContext(supabase: { from: (t: string) => any }, userId: string) {
  const [{ data: company }, { data: periods }, { data: risks }] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("financial_periods")
      .select("*")
      .eq("user_id", userId)
      .order("period_end", { ascending: false })
      .limit(6),
    supabase.from("risk_items").select("*").eq("user_id", userId).limit(20),
  ]);
  return { company, periods: periods ?? [], risks: risks ?? [] };
}

function computeGrowthMetrics(periods: Array<Record<string, unknown>>) {
  const sorted = [...periods].sort((a, b) =>
    String(a.period_end).localeCompare(String(b.period_end)),
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  if (!latest) {
    return {
      burnRate: null,
      runwayMonths: null,
      growthRate: null,
      cac: null,
      ltv: null,
      mrr: null,
      hasData: false,
    };
  }
  const rev = Number(latest.revenue_dzd) || 0;
  const opex = Number(latest.opex_dzd) || 0;
  const cash = Number(latest.cash_dzd) || 0;
  const customers = Number(latest.customers_count) || 0;
  const prevRev = prev ? Number(prev.revenue_dzd) || 0 : 0;
  const monthlyBurn = opex > 0 ? opex / 12 : 0;
  const runwayMonths = monthlyBurn > 0 ? cash / monthlyBurn : null;
  const growthRate = prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null;
  const cac = customers > 0 && opex > 0 ? opex / customers : null;
  const ltv = customers > 0 && rev > 0 ? (rev / customers) * 12 : null;
  return {
    burnRate: monthlyBurn > 0 ? Math.round(monthlyBurn) : null,
    runwayMonths: runwayMonths !== null ? Math.round(runwayMonths * 10) / 10 : null,
    growthRate: growthRate !== null ? Math.round(growthRate * 10) / 10 : null,
    cac: cac !== null ? Math.round(cac) : null,
    ltv: ltv !== null ? Math.round(ltv) : null,
    mrr: rev > 0 ? Math.round(rev / 12) : null,
    hasData: true,
  };
}

function ruleBasedRiskAlerts(
  periods: Array<Record<string, unknown>>,
  risks: Array<Record<string, unknown>>,
) {
  const alerts: Array<{ level: string; title: string; body: string }> = [];
  const sorted = [...periods].sort((a, b) =>
    String(a.period_end).localeCompare(String(b.period_end)),
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  if (latest && prev) {
    const rev = Number(latest.revenue_dzd) || 0;
    const prevRev = Number(prev.revenue_dzd) || 0;
    const opex = Number(latest.opex_dzd) || 0;
    const prevOpex = Number(prev.opex_dzd) || 0;
    const cash = Number(latest.cash_dzd) || 0;
    if (prevRev > 0 && rev < prevRev * 0.85) {
      alerts.push({
        level: "critical",
        title: "انخفاض المبيعات",
        body: `الإيرادات انخفضت بنسبة ${Math.round(((prevRev - rev) / prevRev) * 100)}% مقارنة بالفترة السابقة.`,
      });
    }
    if (prevOpex > 0 && opex > prevOpex * 1.2) {
      alerts.push({
        level: "warning",
        title: "ارتفاع المصاريف",
        body: "المصاريف التشغيلية تتجاوز الفترة السابقة بأكثر من 20%.",
      });
    }
    const monthlyBurn = opex / 12;
    if (monthlyBurn > 0 && cash / monthlyBurn < 6) {
      alerts.push({
        level: "critical",
        title: "ضعف التدفقات النقدية",
        body: `الـ Runway أقل من 6 أشهر (${(cash / monthlyBurn).toFixed(1)} شهر).`,
      });
    }
  }
  const openHigh = risks.filter(
    (r) =>
      (r.status === "open" || r.status === "mitigating") &&
      (Number(r.likelihood) >= 4 || Number(r.impact) >= 4),
  );
  if (openHigh.length >= 2) {
    alerts.push({
      level: "warning",
      title: "مخاطر تشغيلية مفتوحة",
      body: `لديك ${openHigh.length} مخاطر عالية التأثير أو الاحتمالية لم تُعالج بعد.`,
    });
  }
  return alerts;
}

function defaultComplianceAlerts(company: Record<string, unknown> | null) {
  const base = [
    {
      category: "contracts",
      title: "مراجعة العقود الأساسية",
      body: "تأكد من وجود عقود عمل، شراكة، وNDA محدّثة.",
      severity: "warning",
    },
    {
      category: "policies",
      title: "سياسات داخلية",
      body: "وثّق سياسات الموارد البشرية والمصاريف والموافقات.",
      severity: "info",
    },
    {
      category: "data",
      title: "حماية البيانات",
      body: "راجع تخزين بيانات العملاء والموافقات وفق القوانين المحلية.",
      severity: "warning",
    },
    {
      category: "internal_control",
      title: "الرقابة الداخلية",
      body: "حدّد صلاحيات الصرف والموافقة على المشتريات.",
      severity: "info",
    },
  ];
  if (!company?.nif || !company?.rc) {
    base.unshift({
      category: "legal",
      title: "وثائق التأسيس",
      body: "أكمل NIF وRC في بطاقة المؤسسة لتجنب مشاكل قانونية.",
      severity: "critical",
    });
  }
  return base;
}

export const listStartupAssessments = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("startup_assessments")
      .select("id,kind,score,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error?.message.includes("startup_assessments")) return { assessments: [] };
    if (error) throw new Error(error.message);
    return { assessments: data ?? [] };
  });

export const getStartupOverview = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    const growth = computeGrowthMetrics(ctx.periods);
    const riskAlerts = ruleBasedRiskAlerts(ctx.periods, ctx.risks);

    let readinessScore: number | null = null;
    const { data: latestReadiness, error: readErr } = await supabase
      .from("startup_assessments")
      .select("score,created_at")
      .eq("user_id", userId)
      .eq("kind", "readiness")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!readErr && latestReadiness) readinessScore = latestReadiness.score;

    let openCompliance = 0;
    const { count, error: compErr } = await supabase
      .from("startup_compliance_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "open");
    if (!compErr) openCompliance = count ?? 0;

    return {
      readinessScore,
      growth,
      riskAlertCount: riskAlerts.length,
      openCompliance,
      hasCompany: !!ctx.company,
    };
  });

export const getGrowthDashboard = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    return { metrics: computeGrowthMetrics(ctx.periods), periods: ctx.periods };
  });

export const getRiskPredictions = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    return { alerts: ruleBasedRiskAlerts(ctx.periods, ctx.risks), risks: ctx.risks };
  });

export const listComplianceAlerts = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("startup_compliance_alerts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error?.message.includes("startup_compliance_alerts")) return { alerts: [] };
    if (error) throw new Error(error.message);
    return { alerts: data ?? [] };
  });

export const refreshComplianceAlerts = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { company } = await loadContext(supabase, userId);
    const items = defaultComplianceAlerts(company as Record<string, unknown> | null);

    await supabase
      .from("startup_compliance_alerts")
      .update({ status: "dismissed" })
      .eq("user_id", userId)
      .eq("status", "open");

    const rows = items.map((i) => ({ ...i, user_id: userId, status: "open" }));
    const { error } = await supabase.from("startup_compliance_alerts").insert(rows);
    if (error?.message.includes("startup_compliance_alerts")) {
      throw new Error("طبّق migration startup_services على Supabase ثم أعد المحاولة");
    }
    throwIfStartupDbError(error);
    return { ok: true, count: rows.length };
  });

export const updateComplianceAlert = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "done", "dismissed"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("startup_compliance_alerts")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const readinessSchema = z.object({
  management: z.number().int().min(1).max(5),
  finance: z.number().int().min(1).max(5),
  governance: z.number().int().min(1).max(5),
  legal: z.number().int().min(1).max(5),
  risk: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional(),
});

export const runReadinessAssessment = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) => readinessSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const avg = (data.management + data.finance + data.governance + data.legal + data.risk) / 5;
    const baseScore = Math.round((avg / 5) * 100);
    const { company } = await loadContext(supabase, userId);

    let report: Record<string, unknown> = {
      dimensions: [
        { key: "management", score: data.management * 20, label: "الإدارة" },
        { key: "finance", score: data.finance * 20, label: "المالية" },
        { key: "governance", score: data.governance * 20, label: "الحوكمة" },
        { key: "legal", score: data.legal * 20, label: "القانونية" },
        { key: "risk", score: data.risk * 20, label: "المخاطر" },
      ],
      diagnosis: "",
      actionPlan: [] as string[],
    };

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { object } = await generateObject({
        model,
        schema: z.object({
          diagnosis: z.string(),
          actionPlan: z.array(z.string()).min(3).max(8),
          strengths: z.array(z.string()).max(5),
          weaknesses: z.array(z.string()).max(5),
        }),
        prompt: `أنت مستشار للمؤسسات الناشئة في الجزائر. قيّم جاهزية startup بناءً على:
الإدارة ${data.management}/5، المالية ${data.finance}/5، الحوكمة ${data.governance}/5، القانونية ${data.legal}/5، المخاطر ${data.risk}/5.
مؤسسة: ${company?.legal_name ?? "غير محددة"}، قطاع: ${company?.sector ?? "—"}.
ملاحظات: ${data.notes ?? "لا توجد"}.
أعطِ تشخيصاً وخطة تطوير عملية بالعربية.`,
      });
      report = { ...report, ...object };
    } catch {
      report.diagnosis =
        baseScore >= 70
          ? "مؤسستك تظهر جاهزية جيدة مع بعض الفجوات القابلة للمعالجة."
          : "هناك فجوات تنظيمية يجب معالجتها قبل التوسع أو جذب الاستثمار.";
      report.actionPlan = [
        "أكمل الوثائق القانونية في بطاقة المؤسسة",
        "وثّق إجراءات الموافقة والصلاحيات",
        "أدخل فترة مالية ربع سنوية لمتابعة الـ Runway",
      ];
    }

    const { data: row, error } = await supabase
      .from("startup_assessments")
      .insert({
        user_id: userId,
        kind: "readiness",
        score: baseScore,
        payload: data,
        report,
      })
      .select("id,score,report,created_at")
      .single();
    throwIfStartupDbError(error);
    return { assessment: row };
  });

const investorSchema = z.object({
  pitchSummary: z.string().min(20).max(8000),
  businessModel: z.string().min(10).max(4000),
  revenueModel: z.string().min(10).max(4000),
  projections: z.string().min(10).max(4000),
});

export const runInvestorReadiness = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) => investorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { company, periods } = await loadContext(supabase, userId);
    const growth = computeGrowthMetrics(periods);

    let report: Record<string, unknown> = { feedback: [], score: 50, summary: "" };

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { object } = await generateObject({
        model,
        schema: z.object({
          score: z.number().int().min(0).max(100),
          summary: z.string(),
          feedback: z.array(
            z.object({
              area: z.string(),
              rating: z.enum(["strong", "needs_work", "critical"]),
              comment: z.string(),
            }),
          ),
        }),
        prompt: `حلّل جاهزية مستثمر لـ startup جزائرية:
Pitch: ${data.pitchSummary}
نموذج العمل: ${data.businessModel}
نموذج الإيرادات: ${data.revenueModel}
توقعات مالية: ${data.projections}
بيانات فعلية: MRR≈${growth.mrr ?? "غير متوفر"}, Runway=${growth.runwayMonths ?? "—"} شهر.
الشركة: ${company?.legal_name ?? "—"}, مرحلة: ${company?.stage ?? "—"}.
أجب بالعربية.`,
      });
      report = object;
    } catch {
      report = {
        score: 55,
        summary: "تحتاج لتوضيح نموذج الإيرادات والتوقعات المالية قبل مقابلة المستثمرين.",
        feedback: [
          { area: "Pitch Deck", rating: "needs_work", comment: "أضف قيمة مضافة واضحة ومؤشرات نمو." },
          { area: "النموذج المالي", rating: "needs_work", comment: "اربط التوقعات ببيانات KPI الفعلية." },
        ],
      };
    }

    const { data: row, error } = await supabase
      .from("startup_assessments")
      .insert({
        user_id: userId,
        kind: "investor",
        score: (report as { score: number }).score,
        payload: data,
        report,
      })
      .select("id,score,report,created_at")
      .single();
    throwIfStartupDbError(error);
    return { assessment: row };
  });

const label1275Schema = z.object({
  isInnovative: z.boolean(),
  hasTechComponent: z.boolean(),
  hasScalability: z.boolean(),
  hasMarketStudy: z.boolean(),
  hasPitchDeck: z.boolean(),
  hasGrowthMetrics: z.boolean(),
  projectDescription: z.string().min(20).max(5000),
});

export const runLabel1275Assessment = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) => label1275Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let points = 0;
    if (data.isInnovative) points += 20;
    if (data.hasTechComponent) points += 15;
    if (data.hasScalability) points += 15;
    if (data.hasMarketStudy) points += 15;
    if (data.hasPitchDeck) points += 15;
    if (data.hasGrowthMetrics) points += 20;

    const recommendedPath =
      data.isInnovative || data.hasTechComponent ? "incubator_1275" : "cde";

    let report: Record<string, unknown> = {
      recommendedPath,
      compatibilityScore: points,
      cdeChecklist: [
        "دراسة السوق",
        "تحليل SWOT",
        "نموذج العمل BMC",
        "الدراسة التقنية",
        "التكاليف والإيرادات",
      ],
      incubatorChecklist: [
        "وصف الابتكار والقيمة المضافة",
        "تحليل الجاهزية لوسم مؤسسة ناشئة",
        "Pitch Deck احترافي",
        "مؤشرات النمو والتوسع",
        "فرص التمويل والاستثمار",
        "نموذج العمل التجاري BMC",
        "الجوانب المالية للمشروع",
      ],
      advice: "",
    };

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { object } = await generateObject({
        model,
        schema: z.object({
          advice: z.string(),
          gaps: z.array(z.string()).max(8),
          recommendedPath: z.enum(["cde", "incubator_1275", "both_review"]),
        }),
        prompt: `قيّم توافق مشروع مع مسار CDE أو حاضنة 1275:
${JSON.stringify(data)}
وصف المشروع: ${data.projectDescription}
أجب بالعربية.`,
      });
      report = { ...report, ...object };
    } catch {
      report.advice =
        recommendedPath === "incubator_1275"
          ? "مشروعك يميل لمسار الحاضنة 1275 — ركّز على الابتكار وPitch Deck ومؤشرات النمو."
          : "مشروعك يميل لمسار CDE — ركّز على دراسة السوق والجدوى الاقتصادية.";
      report.gaps = data.hasPitchDeck ? [] : ["إعداد Pitch Deck", "توثيق مؤشرات النمو"];
    }

    const { data: row, error } = await supabase
      .from("startup_assessments")
      .insert({
        user_id: userId,
        kind: "label1275",
        score: points,
        payload: data,
        report,
      })
      .select("id,score,report,created_at")
      .single();
    throwIfStartupDbError(error);
    return { assessment: row };
  });

export const getLatestAssessment = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) => z.object({ kind: assessmentKind }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("startup_assessments")
      .select("*")
      .eq("user_id", context.userId)
      .eq("kind", data.kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error?.message.includes("startup_assessments")) return { assessment: null };
    if (error) throw new Error(error.message);
    return { assessment: row };
  });

export const listStartupWorks = createServerFn({ method: "GET" })
  .middleware([...startupAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("startup_works")
      .select("module,project_title,updated_at")
      .eq("user_id", context.userId);
    if (error?.message.includes("startup_works")) return { works: [] };
    if (error) throw new Error(error.message);
    return { works: data ?? [] };
  });

export const getStartupWork = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) => z.object({ module: startupWorkModuleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("startup_works")
      .select("*")
      .eq("user_id", context.userId)
      .eq("module", data.module)
      .maybeSingle();
    if (error?.message.includes("startup_works")) return { work: null };
    if (error) throw new Error(error.message);
    return { work: row };
  });

export const generateStartupWork = createServerFn({ method: "POST" })
  .middleware([...startupAuth])
  .inputValidator((d) =>
    z
      .object({
        module: startupWorkModuleSchema,
        projectTitle: z.string().min(2).max(200),
        projectSummary: z.string().min(20).max(8000),
        extraNotes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { company, periods } = await loadContext(supabase, userId);
    const growth = computeGrowthMetrics(periods);
    const payload = {
      projectTitle: data.projectTitle,
      projectSummary: data.projectSummary,
      extraNotes: data.extraNotes ?? "",
    };

    let report: Record<string, unknown> = {
      sections: [
        {
          title: "ملخص",
          content: `مسودة ${data.module} لمشروع «${data.projectTitle}». أكمل التفاصيل واربطها بمؤشراتك الفعلية.`,
        },
      ],
    };

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const basePrompt = `${STARTUP_WORK_PROMPTS[data.module]}
عنوان المشروع: ${data.projectTitle}
وصف المشروع: ${data.projectSummary}
ملاحظات: ${data.extraNotes ?? "لا توجد"}
مؤسسة: ${company?.legal_name ?? "غير محددة"}، قطاع: ${company?.sector ?? "—"}
بيانات مالية: MRR≈${growth.mrr ?? "غير متوفر"}, Runway=${growth.runwayMonths ?? "—"} شهر.
أجب بالعربية بصيغة مناسبة لمؤسسة ناشئة تستهدف النمو والاستثمار.`;

      if (data.module === "bmc") {
        const { object } = await generateObject({
          model,
          schema: z.object({ blocks: bmcBlocksSchema, checklist: z.array(z.string()).max(10).optional() }),
          prompt: basePrompt,
        });
        report = object;
      } else {
        const { object } = await generateObject({
          model,
          schema: z.object({
            sections: z
              .array(z.object({ title: z.string(), content: z.string() }))
              .min(3)
              .max(12),
            checklist: z.array(z.string()).max(10).optional(),
          }),
          prompt: basePrompt,
        });
        report = object;
      }
    } catch {
      report = {
        sections: [
          { title: "مقدمة", content: data.projectSummary },
          { title: "ملاحظات", content: data.extraNotes || "—" },
        ],
      };
    }

    const { data: row, error } = await supabase
      .from("startup_works")
      .upsert(
        {
          user_id: userId,
          module: data.module,
          project_title: data.projectTitle,
          payload,
          report,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module" },
      )
      .select("*")
      .single();
    throwIfStartupDbError(error);
    return { work: row };
  });
