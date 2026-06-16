import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { useAuth } from "@/hooks/useAuth";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  getCourseBySlug,
  myEnrollment,
  enrollInCourse,
  completeLesson,
  generateAiQuizForLesson,
  requestProfessorExam,
} from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Clock, CheckCircle2, PlayCircle, BookOpen, Award, Bot, AlertCircle, MessageSquare, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/courses/$slug")({
  beforeLoad: ensureAcademicAccount,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — AuditNova` }, { name: "robots", content: "noindex" }],
  }),
  component: CourseDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">404</div>,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchCourse = useTypedServerFn(getCourseBySlug);
  const fetchEnrollment = useTypedServerFn(myEnrollment);
  const enrollFn = useTypedServerFn(enrollInCourse);
  const completeFn = useTypedServerFn(completeLesson);
  const aiQuizFn = useTypedServerFn(generateAiQuizForLesson);
  const requestExamFn = useTypedServerFn(requestProfessorExam);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchCourse({ slug }),
  });

  const course = data?.course;
  const modules = data?.modules ?? [];

  const { data: enrData, refetch: refetchEnr } = useQuery({
    queryKey: ["enrollment", course?.id],
    queryFn: () => fetchEnrollment({ courseId: course!.id }),
    enabled: !!course?.id,
  });

  const enroll = useMutation({
    mutationFn: () => enrollFn({ courseId: course!.id }),
    onSuccess: () => {
      toast.success(t("lms.enrollPending"));
      refetchEnr();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aiQuiz = useMutation({
    mutationFn: (lessonId: string) => aiQuizFn({ lessonId, courseId: course!.id }),
    onSuccess: () => {
      toast.success(t("lms.aiQuizReady"));
      navigate({ to: "/dashboard/quizzes" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: (lessonId: string) => completeFn({ lessonId, courseId: course!.id }),
    onSuccess: (res) => {
      refetchEnr();
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      if (res.needsProfessorQuiz) {
        toast.success(t("lms.courseDoneNeedsQuiz"));
      } else {
        toast.success(t("lms.lessonDone"));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestExam = useMutation({
    mutationFn: () => requestExamFn({ courseId: course!.id }),
    onSuccess: () => {
      toast.success(t("lms.examRequestSent"));
      refetchEnr();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">{t("common.loading")}</div>;
  if (!course) return <div className="p-8">{t("lms.notFound")}</div>;

  const isInstructor = !!user?.id && course.instructor_id === user.id;
  const enrolled = !!enrData?.enrollment;
  const enrollmentStatus = (enrData?.enrollment as { status?: string } | null)?.status ?? (enrolled ? "approved" : null);
  const approved = enrData?.approved ?? enrollmentStatus === "approved";
  const pending = enrollmentStatus === "pending";
  const rejected = enrollmentStatus === "rejected";
  const completedIds = new Set(enrData?.completedLessonIds ?? []);
  const allLessons = modules.flatMap((m) => m.lessons);
  const activeLesson = activeLessonId
    ? allLessons.find((l) => l.id === activeLessonId)
    : allLessons[0];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <Card className="overflow-hidden mb-6 border-border/60">
        <div className="grid md:grid-cols-2">
          <div className="aspect-video md:aspect-auto bg-muted">
            {course.cover_url ? (
              <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center gradient-brand min-h-[200px]">
                <GraduationCap className="h-16 w-16 text-primary-foreground/80" />
              </div>
            )}
          </div>
          <CardContent className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline">{t(`lms.levels.${course.level}`)}</Badge>
              {course.category && <Badge variant="secondary">{course.category}</Badge>}
              {course.duration_minutes ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(course.duration_minutes / 60)} {t("lms.hours")}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
            {course.subtitle && <p className="text-muted-foreground mt-2">{course.subtitle}</p>}
            {course.description && <p className="text-sm mt-3 whitespace-pre-line">{course.description}</p>}

            {pending && (
              <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{t("lms.enrollmentPending")}</p>
              </div>
            )}
            {rejected && (
              <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{t("lms.enrollmentRejected")}</p>
              </div>
            )}
            {enrolled && approved ? (
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("lms.progress")}</span>
                  <span className="font-medium">{enrData?.enrollment?.progress_pct ?? 0}%</span>
                </div>
                <Progress value={enrData?.enrollment?.progress_pct ?? 0} className="h-2" />
                {enrData?.enrollment?.completed_at && (
                  <Badge className="mt-2"><Award className="h-3 w-3 me-1" />{t("lms.completed")}</Badge>
                )}
                {enrData?.canRequestExam && (
                  <Button
                    className="mt-3"
                    onClick={() => requestExam.mutate()}
                    disabled={requestExam.isPending}
                  >
                    <GraduationCap className="h-4 w-4 me-2" />
                    {t("lms.requestExam")}
                  </Button>
                )}
                {enrData?.examRequested && !enrData?.assignedQuizId && (
                  <p className="text-sm text-muted-foreground mt-2">{t("lms.examRequestPending")}</p>
                )}
                {enrData?.assignedQuizId && (
                  <Button className="mt-3" asChild>
                    <Link to="/dashboard/quizzes" search={{ quiz: enrData.assignedQuizId }}>
                      <GraduationCap className="h-4 w-4 me-2" />
                      {t("lms.goToExam")}
                    </Link>
                  </Button>
                )}
                {course.instructor_id && (
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/dashboard/messages" search={{ peer: course.instructor_id }}>
                      <MessageSquare className="h-4 w-4 me-2" />
                      {t("lms.messageProfessor")}
                    </Link>
                  </Button>
                )}
              </div>
            ) : !enrolled && !isInstructor ? (
              <Button className="mt-5" size="lg" onClick={() => enroll.mutate()} disabled={enroll.isPending}>
                <BookOpen className="h-4 w-4 me-2" />
                {course.price_dzd === 0 ? t("lms.enrollFree") : `${t("lms.enroll")} — ${course.price_dzd.toLocaleString()} ${t("pricing.currency")}`}
              </Button>
            ) : isInstructor ? (
              <Badge className="mt-5" variant="secondary">دورتك — لا يمكنك التسجيل</Badge>
            ) : null}
          </CardContent>
        </div>
      </Card>

      {/* Curriculum + Player */}
      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        {/* Curriculum */}
        <Card className="border-border/60 max-h-[70vh] overflow-y-auto">
          <CardContent className="p-3">
            <h2 className="font-semibold text-sm mb-3 px-2">{t("lms.curriculum")}</h2>
            {modules.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">{t("lms.noContent")}</p>
            )}
            {modules.map((m) => (
              <div key={m.id} className="mb-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground px-2 py-1">{m.title}</div>
                <ul className="space-y-1">
                  {m.lessons.map((l) => {
                    const done = completedIds.has(l.id);
                    const canOpen = (approved && enrolled) || l.is_free_preview || isInstructor;
                    const isActive = (activeLessonId ?? allLessons[0]?.id) === l.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => canOpen && setActiveLessonId(l.id)}
                          disabled={!canOpen}
                          className={`w-full text-start text-sm flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                            isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                          } ${!canOpen ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="flex-1 line-clamp-2">{l.title}</span>
                          {l.is_free_preview && !enrolled && (
                            <Badge variant="outline" className="text-[10px] px-1">{t("lms.preview")}</Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Player */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            {!activeLesson && <p className="text-muted-foreground">{t("lms.selectLesson")}</p>}
            {activeLesson && pending && !activeLesson.is_free_preview && (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-muted text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{t("lms.contentLockedPending")}</p>
              </div>
            )}
            {activeLesson && rejected && !activeLesson.is_free_preview && (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-destructive/10 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{t("lms.contentLockedRejected")}</p>
              </div>
            )}
            {activeLesson && ((approved && enrolled) || activeLesson.is_free_preview || isInstructor) && (
              <>
                <h2 className="text-xl font-bold mb-3">{activeLesson.title}</h2>
                {activeLesson.video_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    <iframe
                      src={toEmbedUrl(activeLesson.video_url)}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {activeLesson.content_md && (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
                    {activeLesson.content_md}
                  </div>
                )}
                {activeLesson.pdf_url && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {t("lms.lessonPdf")}
                    </p>
                    <iframe
                      src={activeLesson.pdf_url}
                      title={activeLesson.title}
                      className="w-full h-[min(70vh,600px)] rounded-lg border bg-muted"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <a href={activeLesson.pdf_url} target="_blank" rel="noopener noreferrer">
                        {t("lms.downloadPdf")}
                      </a>
                    </Button>
                  </div>
                )}
                {approved && enrolled && !isInstructor && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {completedIds.has(activeLesson.id) ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />{t("lms.lessonDone")}
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => complete.mutate(activeLesson.id)}
                        disabled={complete.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 me-2" />
                        {t("lms.markComplete")}
                      </Button>
                    )}
                    {activeLesson.content_md && (
                      <Button
                        variant="outline"
                        onClick={() => aiQuiz.mutate(activeLesson.id)}
                        disabled={aiQuiz.isPending}
                      >
                        <Bot className="h-4 w-4 me-2" />
                        {t("lms.generateAiQuiz")}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 text-center">
        <Button variant="ghost" asChild>
          <Link to="/dashboard/learning">← {t("lms.backToCatalog")}</Link>
        </Button>
      </div>
    </div>
  );
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}
