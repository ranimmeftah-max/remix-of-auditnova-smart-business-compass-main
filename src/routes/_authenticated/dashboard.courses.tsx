import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { myCourses } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/courses")({
  beforeLoad: ensureAcademicAccount,
  head: () => ({ meta: [{ title: "دوراتي — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: CoursesLayout,
});

function CoursesLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // If on /dashboard/courses exactly, show "my courses". Otherwise render child route.
  if (path === "/dashboard/courses") return <MyCourses />;
  return <Outlet />;
}

function MyCourses() {
  const { t } = useTranslation();
  const fetchMine = useServerFn(myCourses);
  const { data, isLoading } = useQuery({ queryKey: ["my-courses"], queryFn: () => fetchMine() });
  const enrollments = (data?.enrollments ?? []) as Array<{
    id: string;
    progress_pct: number;
    completed_at: string | null;
    course: { id: string; slug: string; title: string; cover_url: string | null } | null;
  }>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            {t("lms.myCourses")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("lms.myCoursesSubtitle")}</p>
        </div>
        <Button asChild variant="outline"><Link to="/dashboard/learning"><BookOpen className="h-4 w-4 me-2" />{t("lms.browse")}</Link></Button>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {!isLoading && enrollments.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {t("lms.noEnrollments")}
          <div className="mt-4"><Button asChild><Link to="/dashboard/learning">{t("lms.browse")}</Link></Button></div>
        </CardContent></Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrollments.map((e) => e.course && (
          <Link key={e.id} to="/dashboard/courses/$slug" params={{ slug: e.course.slug }}>
            <Card className="overflow-hidden hover:shadow-elegant transition-shadow h-full border-border/60">
              <div className="aspect-video bg-muted">
                {e.course.cover_url ? (
                  <img src={e.course.cover_url} alt={e.course.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center gradient-brand">
                    <GraduationCap className="h-12 w-12 text-primary-foreground/80" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2">{e.course.title}</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("lms.progress")}</span>
                    <span className="font-medium">{e.progress_pct}%</span>
                  </div>
                  <Progress value={e.progress_pct} className="h-2" />
                </div>
                {e.completed_at && (
                  <Badge className="mt-3" variant="default">
                    <CheckCircle2 className="h-3 w-3 me-1" />{t("lms.completed")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
