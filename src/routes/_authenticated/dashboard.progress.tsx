import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { myCourses, myCertificates } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, BookOpen, Award, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/progress")({
  beforeLoad: ensureAcademicAccount,
  head: () => ({ meta: [{ title: "تقدمي — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t } = useTranslation();
  const f1 = useServerFn(myCourses);
  const f2 = useServerFn(myCertificates);
  const { data: c } = useQuery({ queryKey: ["my-courses"], queryFn: () => f1() });
  const { data: ce } = useQuery({ queryKey: ["my-certificates"], queryFn: () => f2() });
  const enrollments = (c?.enrollments ?? []) as Array<{
    id: string; progress_pct: number; completed_at: string | null;
    course: { slug: string; title: string } | null;
  }>;
  const certs = ce?.certificates ?? [];

  const completed = enrollments.filter((e) => e.completed_at).length;
  const avg = enrollments.length === 0
    ? 0
    : Math.round(enrollments.reduce((a, e) => a + e.progress_pct, 0) / enrollments.length);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          {t("lms.progressTitle")}
        </h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label={t("lms.enrolled")} value={enrollments.length} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} label={t("lms.completed")} value={completed} />
        <StatCard icon={<Award className="h-5 w-5 text-primary" />} label={t("lms.certificates")} value={certs.length} />
      </div>

      <Card className="mb-6 border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{t("lms.avgProgress")}</span>
            <span className="text-2xl font-bold">{avg}%</span>
          </div>
          <Progress value={avg} className="h-3" />
        </CardContent>
      </Card>

      <h2 className="font-semibold mb-3">{t("lms.coursesProgress")}</h2>
      <div className="space-y-3">
        {enrollments.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">
            {t("lms.noEnrollments")}
          </CardContent></Card>
        )}
        {enrollments.map((e) => e.course && (
          <Link key={e.id} to="/dashboard/courses/$slug" params={{ slug: e.course.slug }}>
            <Card className="border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{e.course.title}</h3>
                  <span className="text-sm font-medium text-muted-foreground">{e.progress_pct}%</span>
                </div>
                <Progress value={e.progress_pct} className="h-2" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
