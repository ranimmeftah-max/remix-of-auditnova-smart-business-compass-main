import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isStartup, isMicroEnterprise, isSme } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot, FileText, ShieldAlert, TrendingUp, Building2, Gauge, Users, Briefcase,
  Scale, BookOpen, GraduationCap, Award, Search, FolderKanban,
  ArrowUpRight, Sparkles, CheckCircle2, Clock, Rocket, BookMarked, BarChart3, Grid3x3, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AccountType = "enterprise" | "professional" | "academic" | "investor";
type Profile = { first_name: string | null; last_name: string | null; account_type: AccountType; account_subtype: string | null };

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

type Stat = { label: string; value: string; hint: string; icon: LucideIcon };
type Action = { title: string; desc: string; to: string; icon: LucideIcon };

const CONTENT: Record<AccountType | "academicProfessor" | "enterpriseMicro" | "enterpriseStartup" | "enterpriseSme", { tagline: string; stats: Stat[]; actions: Action[]; tasks: string[] }> = {
  enterpriseStartup: {
    tagline: "8 خدمات ابتكارية لرفع جاهزية مؤسستك الناشئة — من التقييم إلى جذب الاستثمار.",
    stats: [
      { label: "درجة الجاهزية", value: "—", hint: "أجرِ التقييم الذاتي", icon: Gauge },
      { label: "Runway", value: "—", hint: "أضف بيانات KPI", icon: TrendingUp },
      { label: "تنبيهات المخاطر", value: "0", hint: "تحليل AI", icon: ShieldAlert },
      { label: "امتثال مفتوح", value: "0", hint: "Smart Compliance", icon: Scale },
    ],
    actions: [
      { title: "مركز Startup", desc: "الوصول إلى الـ 8 خدمات الابتكارية.", to: "/dashboard/startup", icon: Rocket },
      { title: "نموذج BMC", desc: "صمّم نموذج عملك للتوسع والاستثمار.", to: "/dashboard/startup/bmc", icon: Grid3x3 },
      { title: "الجوانب المالية", desc: "نقطة التعادل والربحية والتدفقات.", to: "/dashboard/startup/financial", icon: Wallet },
      { title: "مسار 1275", desc: "CDE أم حاضنة؟ قيّم مشروعك.", to: "/dashboard/startup/label1275", icon: Award },
    ],
    tasks: [
      "أكمل بطاقة المؤسسة",
      "أجرِ Startup Readiness Assessment",
      "حدّث تنبيهات الامتثال الذكية",
    ],
  },
  enterpriseMicro: {
    tagline: "أدوات مذكرة CDE — من دراسة السوق إلى الجوانب المالية لمشروع Micro Enterprise.",
    stats: [
      { label: "وحدات المذكرة", value: "6", hint: "سوق، SWOT، BMC، تقني، تكاليف، مالي", icon: BookMarked },
      { label: "مسودات محفوظة", value: "0", hint: "ابدأ أول وحدة", icon: FileText },
      { label: "درجة النضج", value: "—", hint: "قيّم مؤسستك", icon: Gauge },
      { label: "التقارير", value: "0", hint: "أنشئ أول تقرير", icon: FileText },
    ],
    actions: [
      { title: "مذكرة CDE", desc: "الوصول إلى الـ 6 وحدات الأساسية.", to: "/dashboard/cde", icon: BookMarked },
      { title: "دراسة السوق", desc: "حجم السوق والمنافسون والعملاء.", to: "/dashboard/cde/market", icon: BarChart3 },
      { title: "نموذج العمل BMC", desc: "القيمة المقترحة والقنوات والإيرادات.", to: "/dashboard/cde/bmc", icon: Grid3x3 },
      { title: "الجوانب المالية", desc: "نقطة التعادل والربحية والتدفقات.", to: "/dashboard/cde/financial", icon: Wallet },
    ],
    tasks: [
      "أكمل بطاقة المؤسسة",
      "أكمل دراسة السوق وتحليل SWOT",
      "أنهِ نموذج BMC والجوانب المالية",
    ],
  },
  enterpriseSme: {
    tagline: "6 أدوات ذكية لإدارة SME — من التدقيق الذكي إلى الامتثال الجبائي والمساعد الذكي.",
    stats: [
      { label: "تقارير التدقيق", value: "0", hint: "شغّل AI Audit", icon: Bot },
      { label: "تنبيهات المخاطر", value: "0", hint: "لوحة المخاطر", icon: ShieldAlert },
      { label: "درجة الرقابة", value: "—", hint: "قيّم الرقابة الداخلية", icon: Gauge },
      { label: "التزامات مستحقة", value: "0", hint: "رزنامة الامتثال", icon: Scale },
    ],
    actions: [
      { title: "مركز SME", desc: "الوصول إلى الـ 6 أدوات الذكية.", to: "/dashboard/sme", icon: Briefcase },
      { title: "التدقيق الذكي", desc: "تحليل الوثائق المحاسبية واكتشاف الأخطاء.", to: "/dashboard/sme/ai-audit", icon: Bot },
      { title: "لوحة KPI", desc: "الربحية والسيولة والمديونية والإنتاجية.", to: "/dashboard/sme/kpi", icon: Gauge },
      { title: "المساعد الذكي", desc: "إجابات وتوصيات لتحسين الأداء.", to: "/dashboard/sme/ai-assistant", icon: Sparkles },
    ],
    tasks: [
      "أكمل بطاقة المؤسسة",
      "أضف فترات مالية في التقارير",
      "فعّل رزنامة الامتثال القانوني",
    ],
  },
  enterprise: {
    tagline: "أدِر التدقيق الداخلي، الامتثال الجبائي، ومؤشرات نضج مؤسستك من مكان واحد.",
    stats: [
      { label: "درجة النضج", value: "—", hint: "ابدأ التقييم الذاتي", icon: Gauge },
      { label: "المخاطر النشطة", value: "0", hint: "لا توجد مخاطر مسجّلة", icon: ShieldAlert },
      { label: "تقارير هذا الشهر", value: "0", hint: "أنشئ أول تقرير", icon: FileText },
      { label: "الجاهزية الاستثمارية", value: "—", hint: "قيّم جاهزيتك", icon: TrendingUp },
    ],
    actions: [
      { title: "بطاقة المؤسسة", desc: "أكمل بيانات شركتك ووثائق التأسيس.", to: "/dashboard/company", icon: Building2 },
      { title: "مساعد التدقيق الذكي", desc: "اطرح أسئلة محاسبية أو امتثالية الآن.", to: "/dashboard/ai-chat", icon: Bot },
      { title: "تقييم النضج", desc: "احصل على درجة حوكمة شركتك.", to: "/dashboard/health", icon: Gauge },
      { title: "إدارة المخاطر", desc: "سجّل المخاطر وخطط المعالجة.", to: "/dashboard/risk", icon: ShieldAlert },
    ],
    tasks: [
      "أكمل ملف المؤسسة (السجل التجاري، NIF/NIS)",
      "ارفع آخر ميزانية وحساب النتائج",
      "ابدأ أول جلسة مع مساعد التدقيق",
    ],
  },
  professional: {
    tagline: "أدر محفظة عملائك، ورش التدقيق، والتزامات المواعيد الجبائية.",
    stats: [
      { label: "العملاء النشطون", value: "0", hint: "أضف عميلك الأول", icon: Users },
      { label: "مهام التدقيق", value: "0", hint: "لا مهام مفتوحة", icon: Briefcase },
      { label: "مواعيد قادمة", value: "0", hint: "خلال 7 أيام", icon: Clock },
      { label: "تقارير قيد الإنجاز", value: "0", hint: "ابدأ تقريراً جديداً", icon: FileText },
    ],
    actions: [
      { title: "العملاء", desc: "أنشئ ملفات لعملاء مكتبك.", to: "/dashboard/clients", icon: Users },
      { title: "ورشة التدقيق", desc: "نظّم مهام الفريق والإجراءات.", to: "/dashboard/workspace", icon: Briefcase },
      { title: "الامتثال", desc: "تتبّع التزامات IFRS / SCF والضرائب.", to: "/dashboard/compliance", icon: Scale },
      { title: "مساعد التدقيق الذكي", desc: "احصل على رأي ثانٍ خبير.", to: "/dashboard/ai-chat", icon: Bot },
    ],
    tasks: [
      "أضف عميلك الأول",
      "ادعُ زملاءك إلى ورشة التدقيق",
      "حدّد قالب تقريرك الافتراضي",
    ],
  },
  academic: {
    tagline: "تعلّم التدقيق والمحاسبة الجزائرية بدورات تفاعلية وشهادات معتمدة.",
    stats: [
      { label: "الدورات المُسجَّلة", value: "0", hint: "تصفّح المسارات", icon: BookOpen },
      { label: "نسبة التقدم", value: "0%", hint: "ابدأ أول درس", icon: TrendingUp },
      { label: "اختبارات مكتملة", value: "0", hint: "لا اختبارات بعد", icon: CheckCircle2 },
      { label: "الشهادات", value: "0", hint: "اربح شهادتك الأولى", icon: Award },
    ],
    actions: [
      { title: "مركز التعلم", desc: "تصفّح المسارات وفق تخصصك.", to: "/dashboard/learning", icon: BookOpen },
      { title: "الدورات", desc: "ابدأ دورة جديدة في التدقيق أو SCF.", to: "/dashboard/courses", icon: GraduationCap },
      { title: "الاختبارات", desc: "قِس فهمك بعد كل وحدة.", to: "/dashboard/quizzes", icon: Sparkles },
      { title: "مساعد التدقيق الذكي", desc: "اسأل عن أي مفهوم محاسبي.", to: "/dashboard/ai-chat", icon: Bot },
    ],
    tasks: [
      "اختر مسارك الأكاديمي (تدقيق / SCF / جباية)",
      "أكمل أول وحدة تعليمية",
      "اجتز اختبار التقييم الأولي",
    ],
  },
  academicProfessor: {
    tagline: "انشر دروسك، وافِ على طلبات التسجيل، وتابع تقدّم طلابك.",
    stats: [
      { label: "دورات منشورة", value: "0", hint: "أنشئ دورتك الأولى", icon: BookOpen },
      { label: "طلبات معلّقة", value: "0", hint: "راجع طلبات التسجيل", icon: Clock },
      { label: "اختبارات", value: "0", hint: "أنشئ اختباراً للطلاب", icon: CheckCircle2 },
      { label: "الطلاب", value: "0", hint: "—", icon: Users },
    ],
    actions: [
      { title: "نشر الدروس", desc: "أنشئ دورة بعنوان وملخص وتخصص ومستوى.", to: "/dashboard/teaching", icon: GraduationCap },
      { title: "طلبات التسجيل", desc: "اقبل أو ارفض طلبات الطلاب.", to: "/dashboard/enrollments", icon: Users },
      { title: "مركز التعلم", desc: "تصفّح كتالوج الدورات.", to: "/dashboard/learning", icon: BookOpen },
      { title: "مساعد التدقيق الذكي", desc: "ساعد في إعداد المحتوى.", to: "/dashboard/ai-chat", icon: Bot },
    ],
    tasks: [
      "انشر أول درس مع وصف المحتوى",
      "راجع طلبات التسجيل المعلّقة",
      "أنشئ اختباراً للطلاب",
    ],
  },
  investor: {
    tagline: "اكتشف الشركات الواعدة، قيّم الجاهزية الاستثمارية، وأدر محفظتك.",
    stats: [
      { label: "فرص مكتشَفة", value: "0", hint: "ابدأ بالبحث", icon: Search },
      { label: "قيد التقييم", value: "0", hint: "لا تقييمات نشطة", icon: Gauge },
      { label: "شركات بالمحفظة", value: "0", hint: "محفظتك فارغة", icon: FolderKanban },
      { label: "متوسط جاهزية الصفقة", value: "—", hint: "—", icon: TrendingUp },
    ],
    actions: [
      { title: "اكتشاف الشركات", desc: "ابحث في قاعدة الشركات الناشئة.", to: "/dashboard/discovery", icon: Search },
      { title: "تقييم الفرص", desc: "احصل على درجة جاهزية مؤتمتة.", to: "/dashboard/evaluation", icon: Gauge },
      { title: "العناية الواجبة", desc: "أدوات تحقق وامتثال للصفقات.", to: "/dashboard/diligence", icon: Scale },
      { title: "المحفظة", desc: "تابع أداء استثماراتك.", to: "/dashboard/portfolio", icon: FolderKanban },
    ],
    tasks: [
      "حدّد قطاعاتك المفضّلة",
      "اضبط معايير التقييم",
      "أضف أول فرصة إلى قائمة المتابعة",
    ],
  },
};

function DashboardHome() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const statsFn = useTypedServerFn(getDashboardStats);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,account_type,account_subtype")
        .eq("id", user.user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, []);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
    enabled: !!profile,
  });

  const accountType = profile?.account_type ?? "enterprise";
  const contentKey: AccountType | "academicProfessor" | "enterpriseMicro" | "enterpriseStartup" | "enterpriseSme" =
    accountType === "academic" && profile?.account_subtype === "Professor"
      ? "academicProfessor"
      : accountType === "enterprise" && isMicroEnterprise(profile?.account_subtype)
        ? "enterpriseMicro"
        : accountType === "enterprise" && isStartup(profile?.account_subtype)
          ? "enterpriseStartup"
          : accountType === "enterprise" && isSme(profile?.account_subtype)
            ? "enterpriseSme"
            : accountType;
  const c = CONTENT[contentKey];
  const stats = useMemo(() => {
    const live = statsData?.stats ?? [];
    return c.stats.map((s, i) => ({
      ...s,
      value: live[i]?.value ?? (statsLoading ? "…" : s.value),
      hint: live[i]?.hint ?? s.hint,
    }));
  }, [c.stats, statsData, statsLoading]);
  const name = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "";
  const subtypeLabel = profile?.account_subtype
    ? t(`accounts.subtypes.${profile.account_subtype}`, { defaultValue: profile.account_subtype })
    : null;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 md:p-10 shadow-lg">
          <p className="text-xs md:text-sm opacity-80 mb-2">
            {t(`accounts.${accountType}.title`)}
            {subtypeLabel ? ` · ${subtypeLabel}` : ""}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold">
            {name ? t("dashboard.welcome", { name }) : t("common.loading")}
          </h2>
          <p className="mt-3 opacity-90 max-w-2xl">{c.tagline}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/dashboard/ai-chat">
                <Bot className="h-4 w-4" />
                ابدأ محادثة مع المساعد
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href="/dashboard/documents">
                <FileText className="h-4 w-4" />
                المستندات
              </a>
            </Button>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-4">نظرة سريعة</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">{s.label}</CardDescription>
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{t("dashboard.quickActions")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.actions.map((a) => (
                <a
                  key={a.to}
                  href={a.to}
                  className="group rounded-xl border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <a.icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-medium mt-3">{a.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">قائمة الانطلاق</h3>
            <Card>
              <CardContent className="p-4 space-y-3">
                {c.tasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    <span>{task}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-4 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  نصيحة اليوم
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                استخدم المساعد الذكي لطرح أسئلتك حول SCF، الضرائب، أو CASNOS/CNAS — مدرّب على السياق الجزائري.
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
