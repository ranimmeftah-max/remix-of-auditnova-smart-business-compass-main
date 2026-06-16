import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getQuizDetail, listStudentQuizzes, startQuizAttempt, submitQuizAttempt } from "@/lib/lms.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, GraduationCap, Bot, Clock } from "lucide-react";

const quizzesSearchSchema = z.object({ quiz: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/dashboard/quizzes")({
  validateSearch: quizzesSearchSchema,
  beforeLoad: ensureAcademicAccount,
  head: () => ({ meta: [{ title: "الاختبارات — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: QuizzesPage,
});

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function QuizzesPage() {
  const navigate = useNavigate();
  const { quiz: quizFromUrl } = Route.useSearch();
  const listFn = useTypedServerFn(listStudentQuizzes);
  const detailFn = useTypedServerFn(getQuizDetail);
  const startFn = useTypedServerFn(startQuizAttempt);
  const submitFn = useTypedServerFn(submitQuizAttempt);
  const { data, isLoading } = useQuery({ queryKey: ["student-quizzes"], queryFn: () => listFn() });
  const [activeQuizId, setActiveQuizId] = useState<string | null>(quizFromUrl ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; certificateId?: string | null } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (quizFromUrl) setActiveQuizId(quizFromUrl);
  }, [quizFromUrl]);

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["quiz-detail", activeQuizId],
    queryFn: () => detailFn({ quizId: activeQuizId! }),
    enabled: !!activeQuizId,
  });

  const doSubmit = useCallback(async () => {
    if (!activeQuizId || result) return;
    try {
      const res = await submitFn({ quizId: activeQuizId, answers });
      setResult(res);
      if (res.certificateId) {
        toast.success("نجحت وحصلت على الشهادة!");
        navigate({ to: "/dashboard/certificates" });
      } else {
        toast.success(res.passed ? "نجحت في الاختبار!" : `النتيجة: ${res.score}%`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال");
    }
  }, [activeQuizId, answers, result, submitFn, navigate]);

  useEffect(() => {
    if (!activeQuizId || result) return;
    startFn({ quizId: activeQuizId })
      .then((res) => {
        if (res.expiresAt) setExpiresAt(res.expiresAt);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "تعذّر بدء الاختبار"));
  }, [activeQuizId, result, startFn]);

  useEffect(() => {
    if (!expiresAt || result) return;
    const tick = () => {
      const left = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        setTimedOut(true);
        void doSubmit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, result, doSubmit]);

  const submit = useMutation({
    mutationFn: () => doSubmit(),
  });

  const openQuiz = (id: string) => {
    setActiveQuizId(id);
    setAnswers({});
    setResult(null);
    setExpiresAt(null);
    setRemainingMs(null);
    setTimedOut(false);
  };

  const QuizList = ({
    items,
    icon: Icon,
    empty,
  }: {
    items: Array<{ id: string; title: string; description?: string | null; pass_score?: number; time_limit_minutes?: number | null }>;
    icon: typeof Bot;
    empty: string;
  }) => (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      {items.map((q) => (
        <Card key={q.id} className="cursor-pointer hover:border-primary/40" onClick={() => openQuiz(q.id)}>
          <CardContent className="p-4 flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{q.title}</p>
              {q.description && <p className="text-xs text-muted-foreground truncate">{q.description}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              {q.time_limit_minutes ? (
                <Badge variant="outline"><Clock className="h-3 w-3 ml-1" />{q.time_limit_minutes}د</Badge>
              ) : null}
              <Badge variant="outline">{q.pass_score ?? 70}%</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" /> الاختبارات
      </h1>

      {!activeQuizId && (
        <>
          {isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> اختبارات الأستاذ (معيّنة)
            </h2>
            <QuizList
              items={(data?.professorQuizzes ?? []) as Array<{ id: string; title: string; description?: string | null; pass_score?: number; time_limit_minutes?: number | null }>}
              icon={GraduationCap}
              empty="لا توجد اختبارات معيّنة من الأستاذ."
            />
          </section>
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Bot className="h-5 w-5" /> اختبارات الذكاء الاصطناعي
            </h2>
            <QuizList
              items={(data?.aiQuizzes ?? []) as Array<{ id: string; title: string; description?: string | null; pass_score?: number }>}
              icon={Bot}
              empty="لم تُولَّد اختبارات AI بعد."
            />
          </section>
        </>
      )}

      {activeQuizId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>{detail?.quiz?.title ?? "اختبار"}</CardTitle>
            <div className="flex items-center gap-2">
              {remainingMs !== null && !result && (
                <Badge variant={remainingMs < 60_000 ? "destructive" : "secondary"}>
                  <Clock className="h-3 w-3 ml-1" />
                  {formatRemaining(remainingMs)}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => setActiveQuizId(null)}>رجوع</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingDetail && <p className="text-muted-foreground">جارٍ التحميل…</p>}
            {remainingMs !== null && !result && detail?.quiz?.time_limit_minutes && (
              <Progress value={Math.max(0, (remainingMs / (detail.quiz.time_limit_minutes * 60_000)) * 100)} className="h-2" />
            )}
            {result && (
              <div className={`p-4 rounded-lg text-center ${result.passed ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                <p className="text-lg font-bold">{result.score}%</p>
                <p>{timedOut && !result.passed ? "انتهى الوقت" : result.passed ? "نجحت" : "حاول مرة أخرى"}</p>
              </div>
            )}
            {!result && (detail?.questions ?? []).map((q: { id: string; question_text: string; points?: number; choices: Array<{ id: string; choice_text: string }> }, i: number) => (
              <div key={q.id} className="space-y-2">
                <p className="font-medium">
                  {i + 1}. {q.question_text}
                  {q.points && q.points > 1 ? <span className="text-xs text-muted-foreground mr-2">({q.points} نقاط)</span> : null}
                </p>
                <div className="space-y-1">
                  {q.choices.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === c.id}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                      />
                      <span>{c.choice_text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {!result && detail?.questions?.length ? (
              <Button onClick={() => submit.mutate()} disabled={submit.isPending || timedOut}>
                إرسال الإجابات
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
