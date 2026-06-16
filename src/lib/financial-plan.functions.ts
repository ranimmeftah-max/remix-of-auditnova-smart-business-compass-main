import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasCdeAccess, isStartup, requireEnterpriseAccount } from "@/lib/enterprise-access";
import { computeFinancialPlan, financialPlanSchema, uid, type FinancialPlanInput } from "@/lib/financial-plan";
import { z } from "zod";

const planAuth = [requireSupabaseAuth, requireEnterpriseAccount] as const;

const aiPlanSchema = z.object({
  projectTitle: z.string(),
  depreciationYears: z.number().int().min(1).max(20),
  variableCosts: z.array(z.object({ label: z.string(), unitCost: z.number().min(0) })),
  fixedCosts: z.array(z.object({ label: z.string(), annualAmount: z.number().min(0) })),
  sellingPrice: z.number().min(0),
  expectedAnnualQty: z.number().min(0),
  products: z.array(
    z.object({
      designation: z.string(),
      quantities: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
      unitPrice: z.number().min(0),
    }),
  ),
  directCosts: z.array(
    z.object({
      designation: z.string(),
      quantities: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
      unitCost: z.number().min(0),
    }),
  ),
  payroll: z.array(
    z.object({
      role: z.string(),
      baseSalaryMonthly: z.number().min(0),
      etp: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
    }),
  ),
  externalCharges: z.array(
    z.object({
      label: z.string(),
      amounts: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
    }),
  ),
  investments: z.array(
    z.object({
      designation: z.string(),
      functionality: z.string(),
      unitPrice: z.number().min(0),
      amounts: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
    }),
  ),
  comments: z.string().optional(),
});

function withIds(raw: z.infer<typeof aiPlanSchema>): FinancialPlanInput {
  return financialPlanSchema.parse({
    ...raw,
    variableCosts: raw.variableCosts.map((r) => ({ ...r, id: uid() })),
    fixedCosts: raw.fixedCosts.map((r) => ({ ...r, id: uid() })),
    products: raw.products.map((r) => ({ ...r, id: uid() })),
    directCosts: raw.directCosts.map((r) => ({ ...r, id: uid() })),
    payroll: raw.payroll.map((r) => ({ ...r, id: uid() })),
    externalCharges: raw.externalCharges.map((r) => ({ ...r, id: uid() })),
    investments: raw.investments.map((r) => ({ ...r, id: uid() })),
  });
}

function assertFinancialPlanAccess(accountType: string, subtype: string | null) {
  if (accountType !== "enterprise") throw new Error("الخطة المالية متاحة لحسابات المؤسسات فقط");
  if (!isStartup(subtype) && !hasCdeAccess(accountType, subtype)) {
    throw new Error("الخطة المالية متاحة لـ Startup و Micro Enterprise (CDE) فقط");
  }
}

export const getFinancialPlan = createServerFn({ method: "GET" })
  .middleware([...planAuth])
  .handler(async ({ context }) => {
    const profile = context.enterpriseProfile as { account_type: string; account_subtype: string | null };
    assertFinancialPlanAccess(profile.account_type, profile.account_subtype);

    const { data, error } = await context.supabase
      .from("financial_plans")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error?.message.includes("financial_plans")) return { plan: null, report: null };
    if (error) throw new Error(error.message);

    if (!data) return { plan: null, report: null };

    const plan = financialPlanSchema.parse(data.payload);
    const report = computeFinancialPlan(plan);
    return { plan, report, updatedAt: data.updated_at };
  });

export const saveFinancialPlan = createServerFn({ method: "POST" })
  .middleware([...planAuth])
  .inputValidator((d) => financialPlanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const profile = context.enterpriseProfile as { account_type: string; account_subtype: string | null };
    assertFinancialPlanAccess(profile.account_type, profile.account_subtype);

    const report = computeFinancialPlan(data);
    const { data: row, error } = await context.supabase
      .from("financial_plans")
      .upsert(
        {
          user_id: context.userId,
          payload: data,
          report,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error?.message.includes("financial_plans")) {
      throw new Error("طبّق migration financial_plans على Supabase ثم أعد المحاولة");
    }
    if (error) throw new Error(error.message);

    return { plan: row.payload, report, updatedAt: row.updated_at };
  });

export const generateFinancialPlanDraft = createServerFn({ method: "POST" })
  .middleware([...planAuth])
  .inputValidator((d) =>
    z
      .object({
        projectTitle: z.string().min(2).max(200),
        projectSummary: z.string().min(20).max(8000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const profile = context.enterpriseProfile as { account_type: string; account_subtype: string | null };
    assertFinancialPlanAccess(profile.account_type, profile.account_subtype);

    let draft: FinancialPlanInput | null = null;

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const { object } = await generateObject({
        model,
        schema: aiPlanSchema,
        prompt: `أنشئ مسودة خطة مالية لمشروع جزائري بناءً على قالب Business Plan وزارة Startup ونقطة التعادل.
المشروع: ${data.projectTitle}
الوصف: ${data.projectSummary}
املأ: تكاليف متغيرة (CV)، تكاليف ثابتة (CF)، منتج واحد على الأقل بكميات 5 سنوات، مشتريات مباشرة، مسير/عامل واحد على الأقل، مصاريف كراء/صيانة، استثمار معدات.
استخدم أرقام واقعية بالدينار الجزائري.`,
      });
      draft = withIds(object);
    } catch {
      draft = null;
    }

    if (!draft) {
      throw new Error("تعذّر توليد المسودة — أكمل الحقول يدوياً");
    }

    draft.projectTitle = data.projectTitle;
    const report = computeFinancialPlan(draft);

    const { data: row, error } = await context.supabase
      .from("financial_plans")
      .upsert(
        {
          user_id: context.userId,
          payload: draft,
          report,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error?.message.includes("financial_plans")) {
      throw new Error("طبّق migration financial_plans على Supabase ثم أعد المحاولة");
    }
    if (error) throw new Error(error.message);

    return { plan: row.payload, report };
  });
