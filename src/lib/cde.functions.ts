import { createServerFn } from "@tanstack/react-start";
import { requireCdeAccount } from "@/lib/enterprise-access";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { BMC_GENERATION_PROMPT, bmcBlocksSchema } from "@/lib/bmc";

const cdeAuth = [requireSupabaseAuth, requireCdeAccount] as const;

export const cdeModuleIds = ["market", "swot", "bmc", "technical", "costs", "financial"] as const;
export type CdeModuleId = (typeof cdeModuleIds)[number];

const moduleSchema = z.enum(cdeModuleIds);

function throwIfCdeDbError(error: { message: string } | null): void {
  if (!error) return;
  if (error.message.includes("cde_works")) {
    throw new Error("طبّق migration cde_works على Supabase ثم أعد المحاولة");
  }
  throw new Error(error.message);
}

const MODULE_PROMPTS: Record<CdeModuleId, string> = {
  market: "أنشئ دراسة سوق لمذكرة CDE تتضمن: حجم السوق، العرض والطلب، المنافسون، الفئة المستهدفة، قنوات التوزيع.",
  swot: "أنشئ تحليل SWOT كامل (نقاط القوة، الضعف، الفرص، التهديدات) لمشروع CDE.",
  bmc: BMC_GENERATION_PROMPT,
  technical: "أنشئ الدراسة التقنية لمشروع CDE: الموارد البشرية، المعدات، العمليات، الجدولة، الموقع.",
  costs: "أنشئ جدول التكاليف والإيرادات التقديرية لمشروع CDE مع تفصيل بنود الاستثمار والتشغيل.",
  financial: "أنشئ الجوانب المالية للمشروع: نقطة التعادل، الربحية المتوقعة، التدفقات النقدية المبسطة، مؤشرات الجدوى.",
};

export const listCdeWorks = createServerFn({ method: "GET" })
  .middleware([...cdeAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cde_works")
      .select("module,project_title,updated_at")
      .eq("user_id", context.userId);
    if (error?.message.includes("cde_works")) return { works: [] };
    if (error) throw new Error(error.message);
    return { works: data ?? [] };
  });

export const getCdeWork = createServerFn({ method: "POST" })
  .middleware([...cdeAuth])
  .inputValidator((d) => z.object({ module: moduleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cde_works")
      .select("*")
      .eq("user_id", context.userId)
      .eq("module", data.module)
      .maybeSingle();
    if (error?.message.includes("cde_works")) return { work: null };
    if (error) throw new Error(error.message);
    return { work: row };
  });

export const generateCdeWork = createServerFn({ method: "POST" })
  .middleware([...cdeAuth])
  .inputValidator((d) =>
    z
      .object({
        module: moduleSchema,
        projectTitle: z.string().min(2).max(200),
        projectSummary: z.string().min(20).max(8000),
        extraNotes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      projectTitle: data.projectTitle,
      projectSummary: data.projectSummary,
      extraNotes: data.extraNotes ?? "",
    };

    let report: Record<string, unknown> = {
      sections: [
        {
          title: "ملخص",
          content: `مسودة ${data.module} لمشروع «${data.projectTitle}». أكمل التفاصيل حسب إرشادات المشرف.`,
        },
      ],
    };

    try {
      const { generateObject } = await import("ai");
      const { resolveChatModel } = await import("@/lib/ai-model.server");
      const { model } = resolveChatModel();
      const basePrompt = `${MODULE_PROMPTS[data.module]}
عنوان المشروع: ${data.projectTitle}
وصف المشروع: ${data.projectSummary}
ملاحظات: ${data.extraNotes ?? "لا توجد"}
أجب بالعربية بصيغة مناسبة لمذكرة CDE.`;

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
      .from("cde_works")
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
    throwIfCdeDbError(error);
    return { work: row };
  });
