import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ensureProfessorAccount } from "@/lib/academic-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { createProfessorQuiz, myTeachingCourses, publishCourse } from "@/lib/lms.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PenLine, Plus, FileUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/teaching")({
  beforeLoad: ensureProfessorAccount,
  head: () => ({ meta: [{ title: "نشر الدروس — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: TeachingPage,
});

function TeachingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(myTeachingCourses);
  const publishFn = useTypedServerFn(publishCourse);
  const quizFn = useTypedServerFn(createProfessorQuiz);
  const { data, isLoading } = useQuery({ queryKey: ["teaching-courses"], queryFn: () => listFn() });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [language, setLanguage] = useState<"ar" | "fr" | "en">("ar");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [quizCourseId, setQuizCourseId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizPassScore, setQuizPassScore] = useState("70");
  const [quizTimeLimit, setQuizTimeLimit] = useState("30");
  const [quizQ, setQuizQ] = useState("");
  const [quizPoints, setQuizPoints] = useState("5");
  const [quizA, setQuizA] = useState("");
  const [quizB, setQuizB] = useState("");
  const [quizCorrect, setQuizCorrect] = useState<"a" | "b">("a");

  async function uploadPdf(): Promise<string | undefined> {
    if (!pdfFile || !user?.id) return undefined;
    const path = `${user.id}/${Date.now()}-${pdfFile.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("lms-lessons").upload(path, pdfFile, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from("lms-lessons").getPublicUrl(path).data.publicUrl;
  }

  const publish = useMutation({
    mutationFn: async () => {
      const lessonPdfUrl = await uploadPdf();
      return publishFn({
        title,
        subtitle: subtitle || undefined,
        description,
        category,
        level,
        language,
        lessonTitle,
        lessonContent,
        lessonPdfUrl,
        publish: true,
      });
    },
    onSuccess: () => {
      toast.success("تم نشر الدورة");
      qc.invalidateQueries({ queryKey: ["teaching-courses"] });
      setTitle("");
      setSubtitle("");
      setDescription("");
      setCategory("");
      setLessonTitle("");
      setLessonContent("");
      setPdfFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createQuiz = useMutation({
    mutationFn: () =>
      quizFn({
        courseId: quizCourseId!,
        title: quizTitle,
        description: "اختبار الشهادة — من الأستاذ",
        passScore: Number(quizPassScore) || 70,
        timeLimitMinutes: Number(quizTimeLimit) || 30,
        questions: [
          {
            text: quizQ,
            points: Number(quizPoints) || 1,
            choices: [
              { text: quizA, correct: quizCorrect === "a" },
              { text: quizB, correct: quizCorrect === "b" },
            ],
          },
        ],
      }),
    onSuccess: () => {
      toast.success("تم إنشاء الاختبار");
      qc.invalidateQueries({ queryKey: ["teaching-courses"] });
      qc.invalidateQueries({ queryKey: ["pending-enrollments"] });
      setQuizCourseId(null);
      setQuizTitle("");
      setQuizQ("");
      setQuizA("");
      setQuizB("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <PenLine className="h-7 w-7 text-primary" /> نشر الدروس
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-base">دورة جديدة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>عنوان الدورة *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مقدمة في التدقيق الداخلي" />
            </div>
            <div className="space-y-2">
              <Label>ملخص قصير</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="سطر واحد يصف الدورة" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>وصف المحتوى *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>التخصص المقصود *</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">{t("lms.levels.beginner")}</SelectItem>
                  <SelectItem value="intermediate">{t("lms.levels.intermediate")}</SelectItem>
                  <SelectItem value="advanced">{t("lms.levels.advanced")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">الدرس الأول</p>
            <div className="space-y-2">
              <Label>عنوان الدرس *</Label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>محتوى الدرس *</Label>
              <Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={8} />
            </div>
            <div className="space-y-2">
              <Label>ملف PDF (اختياري)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              {pdfFile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileUp className="h-3 w-3" /> {pdfFile.name}
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
            <Plus className="h-4 w-4 ml-2" /> نشر الدورة
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">دوراتي المنشورة</h2>
        {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
        <div className="space-y-3">
          {(data?.courses ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {c.category && <Badge variant="secondary">{c.category}</Badge>}
                      <Badge variant="outline">{t(`lms.levels.${c.level}`)}</Badge>
                      {(c as { quizzes?: Array<{ id: string; title: string }> }).quizzes?.length ? (
                        <Badge variant="default">
                          {(c as { quizzes: Array<{ title: string }> }).quizzes.length} اختبار
                        </Badge>
                      ) : null}
                    </div>
                    {(c as { quizzes?: Array<{ id: string; title: string; pass_score: number; time_limit_minutes: number | null }> }).quizzes?.map((q) => (
                      <p key={q.id} className="text-xs text-muted-foreground mt-1">
                        · {q.title} — {q.pass_score}%{q.time_limit_minutes ? ` · ${q.time_limit_minutes} د` : ""}
                      </p>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/courses/$slug" params={{ slug: c.slug }}>عرض</Link>
                  </Button>
                </div>
                {quizCourseId === c.id ? (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> اختبار الشهادة
                    </p>
                    <Input placeholder="عنوان الاختبار *" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" min={1} max={100} placeholder="نسبة النجاح %" value={quizPassScore} onChange={(e) => setQuizPassScore(e.target.value)} />
                      <Input type="number" min={1} max={180} placeholder="الوقت (دقيقة)" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(e.target.value)} />
                    </div>
                    <Input placeholder="السؤال *" value={quizQ} onChange={(e) => setQuizQ(e.target.value)} />
                    <Input type="number" min={1} max={100} placeholder="نقاط السؤال" value={quizPoints} onChange={(e) => setQuizPoints(e.target.value)} />
                    <Input placeholder="الإجابة أ *" value={quizA} onChange={(e) => setQuizA(e.target.value)} />
                    <Input placeholder="الإجابة ب *" value={quizB} onChange={(e) => setQuizB(e.target.value)} />
                    <Select value={quizCorrect} onValueChange={(v) => setQuizCorrect(v as "a" | "b")}>
                      <SelectTrigger><SelectValue placeholder="الإجابة الصحيحة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a">الإجابة أ</SelectItem>
                        <SelectItem value="b">الإجابة ب</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => createQuiz.mutate()}
                        disabled={createQuiz.isPending || !quizTitle.trim() || !quizQ.trim() || !quizA.trim() || !quizB.trim()}
                      >
                        حفظ الاختبار
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setQuizCourseId(null)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setQuizCourseId(c.id)}>
                    <Sparkles className="h-4 w-4 ml-2" /> إضافة اختبار شهادة
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
