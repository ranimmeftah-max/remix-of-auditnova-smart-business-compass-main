import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardStat = { value: string; hint: string };

function maturityScore(
  latest: {
    revenue_dzd: number | null;
    ebitda_dzd: number | null;
    cash_dzd: number | null;
    assets_dzd: number | null;
    liabilities_dzd: number | null;
    opex_dzd: number | null;
    customers_count: number | null;
  } | null,
  hasCompany: boolean,
): number {
  if (!latest) return 0;
  const rev = Number(latest.revenue_dzd) || 0;
  const ebitda = Number(latest.ebitda_dzd) || 0;
  const cash = Number(latest.cash_dzd) || 0;
  const assets = Number(latest.assets_dzd) || 0;
  const liab = Number(latest.liabilities_dzd) || 0;
  const opex = Number(latest.opex_dzd) || 1;
  const margin = rev > 0 ? ebitda / rev : 0;
  const leverage = assets > 0 ? liab / assets : 1;
  const runway = opex > 0 ? cash / (opex / 12) : 0;
  const items = [
    Math.max(0, Math.min(100, Math.round(margin * 400))),
    Math.max(0, Math.min(100, Math.round((runway / 18) * 100))),
    Math.max(0, Math.min(100, Math.round((1 - leverage) * 100))),
    latest.customers_count && latest.customers_count > 0 ? 80 : 30,
    hasCompany ? 100 : 20,
  ];
  return Math.round(items.reduce((s, i) => s + i, 0) / items.length);
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type,account_subtype")
      .eq("id", userId)
      .maybeSingle();

    const accountType = profile?.account_type ?? "enterprise";
    const subtype = profile?.account_subtype;

    if (accountType === "academic" && subtype === "Professor") {
      const { data: courses } = await supabase.from("lms_courses").select("id").eq("instructor_id", userId);
      const courseIds = (courses ?? []).map((c) => c.id);
      const coursesCount = courseIds.length;

      let pendingCount = 0;
      let studentsCount = 0;
      if (courseIds.length) {
        const { data: enrollments } = await supabase
          .from("lms_enrollments")
          .select("user_id,status")
          .in("course_id", courseIds);
        const rows = enrollments ?? [];
        pendingCount = rows.filter((e) => (e as { status?: string }).status === "pending").length;
        studentsCount = new Set(
          rows.filter((e) => {
            const st = (e as { status?: string }).status;
            return st === "approved" || !st;
          }).map((e) => e.user_id),
        ).size;
      }

      let quizzesCount = 0;
      if (courseIds.length) {
        const { data: quizzes } = await supabase
          .from("lms_quizzes")
          .select("id,source")
          .in("course_id", courseIds);
        quizzesCount = (quizzes ?? []).filter((q) => (q as { source?: string }).source !== "ai").length;
      }

      return {
        stats: [
          { value: String(coursesCount), hint: coursesCount ? "دوراتك المنشورة" : "أنشئ دورتك الأولى" },
          { value: String(pendingCount), hint: pendingCount ? "بانتظار مراجعتك" : "لا طلبات معلّقة" },
          { value: String(quizzesCount), hint: quizzesCount ? "اختبارات منشورة" : "أنشئ اختباراً للطلاب" },
          { value: String(studentsCount), hint: studentsCount ? "طلاب مقبولون" : "لا طلاب بعد" },
        ] satisfies DashboardStat[],
      };
    }

    if (accountType === "academic") {
      const { data: enrollments } = await supabase
        .from("lms_enrollments")
        .select("progress_pct,status")
        .eq("user_id", userId);
      const approved = (enrollments ?? []).filter((e) => {
        const st = (e as { status?: string }).status;
        return st === "approved" || !st;
      });
      const enrolledCount = approved.length;
      const avgProgress =
        enrolledCount === 0
          ? 0
          : Math.round(approved.reduce((s, e) => s + (e.progress_pct ?? 0), 0) / enrolledCount);

      const { count: quizDone } = await supabase
        .from("lms_quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("passed", true);

      const { count: certCount } = await supabase
        .from("lms_certificates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      return {
        stats: [
          { value: String(enrolledCount), hint: enrolledCount ? "دورات مسجّلة" : "تصفّح المسارات" },
          { value: `${avgProgress}%`, hint: avgProgress ? "متوسط تقدّمك" : "ابدأ أول درس" },
          { value: String(quizDone ?? 0), hint: (quizDone ?? 0) ? "اختبارات ناجحة" : "لا اختبارات بعد" },
          { value: String(certCount ?? 0), hint: (certCount ?? 0) ? "شهادات ممنوحة" : "اربح شهادتك الأولى" },
        ] satisfies DashboardStat[],
      };
    }

    if (accountType === "professional") {
      const { count: clientsCount } = await supabase
        .from("pro_clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      const { count: tasksCount } = await supabase
        .from("pro_engagements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count: apptCount } = await supabase
        .from("pro_appointments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", weekLater.toISOString());

      const { count: reportsCount } = await supabase
        .from("pro_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      return {
        stats: [
          { value: String(clientsCount ?? 0), hint: (clientsCount ?? 0) ? "عملاء نشطون" : "أضف عميلك الأول" },
          { value: String(tasksCount ?? 0), hint: (tasksCount ?? 0) ? "مهام مفتوحة" : "لا مهام مفتوحة" },
          { value: String(apptCount ?? 0), hint: "خلال 7 أيام" },
          { value: String(reportsCount ?? 0), hint: (reportsCount ?? 0) ? "تحليلات محفوظة" : "ابدأ تقريراً جديداً" },
        ] satisfies DashboardStat[],
      };
    }

    if (accountType === "investor") {
      const { data: rows } = await supabase
        .from("investment_opportunities")
        .select("recommendation,status,score_overall")
        .eq("user_id", userId);
      const all = rows ?? [];
      const total = all.length;
      const evaluating = all.filter(
        (r) => r.recommendation === "pending" || r.status === "screening" || r.status === "due_diligence",
      ).length;
      const portfolio = all.filter((r) => r.status === "closed").length;
      const scored = all.map((r) => Number(r.score_overall)).filter((n) => Number.isFinite(n));
      const avgScore =
        scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

      return {
        stats: [
          { value: String(total), hint: total ? "فرص في المحفظة" : "ابدأ بالبحث" },
          { value: String(evaluating), hint: evaluating ? "قيد التقييم" : "لا تقييمات نشطة" },
          { value: String(portfolio), hint: portfolio ? "صفقات مغلقة" : "محفظتك فارغة" },
          { value: avgScore !== null ? String(avgScore) : "—", hint: avgScore !== null ? "متوسط الجاهزية" : "—" },
        ] satisfies DashboardStat[],
      };
    }

    const [{ data: periods }, { data: company }, { data: risks }, { data: reports }, { data: rounds }] =
      await Promise.all([
        supabase.from("financial_periods").select("*").eq("user_id", userId).order("period_end"),
        supabase.from("companies").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("risk_items").select("status").eq("user_id", userId),
        supabase.from("audit_reports").select("created_at").eq("user_id", userId),
        supabase.from("investment_rounds").select("target_amount_dzd,raised_amount_dzd,status").eq("user_id", userId),
      ]);

    const sorted = [...(periods ?? [])].sort((a, b) => a.period_end.localeCompare(b.period_end));
    const latest = sorted[sorted.length - 1] ?? null;
    const score = maturityScore(latest, !!company);

    const openRisks = (risks ?? []).filter((r) => r.status !== "closed").length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const reportsThisMonth = (reports ?? []).filter((r) => new Date(r.created_at) >= monthStart).length;

    const activeRounds = (rounds ?? []).filter((r) => r.status !== "closed");
    let readiness = "—";
    if (activeRounds.length) {
      const targets = activeRounds.reduce((s, r) => s + (Number(r.target_amount_dzd) || 0), 0);
      const raised = activeRounds.reduce((s, r) => s + (Number(r.raised_amount_dzd) || 0), 0);
      readiness = targets > 0 ? `${Math.round((raised / targets) * 100)}%` : "—";
    }

    return {
      stats: [
        { value: latest ? String(score) : "—", hint: latest ? "من آخر فترة مالية" : "ابدأ التقييم الذاتي" },
        { value: String(openRisks), hint: openRisks ? "مخاطر تحت المتابعة" : "لا مخاطر مسجّلة" },
        { value: String(reportsThisMonth), hint: reportsThisMonth ? "هذا الشهر" : "أنشئ أول تقرير" },
        { value: readiness, hint: activeRounds.length ? "جاهزية التمويل" : "قيّم جاهزيتك" },
      ] satisfies DashboardStat[],
    };
  });
