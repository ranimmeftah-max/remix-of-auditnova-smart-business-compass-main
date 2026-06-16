import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ensureProfessorAccount } from "@/lib/academic-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { assignQuizToStudent, listPendingEnrollments, reviewEnrollment } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, GraduationCap, Bell } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/enrollments")({
  beforeLoad: ensureProfessorAccount,
  head: () => ({ meta: [{ title: "طلبات التسجيل — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: EnrollmentsPage,
});

type RequestRow = {
  id: string;
  status?: string;
  enrolled_at: string;
  course_id: string;
  course_title: string;
  user_id: string;
  progress_pct?: number;
  exam_requested_at?: string | null;
  student: { first_name: string | null; last_name: string | null; account_subtype: string | null } | null;
  quizzes: Array<{ id: string; title: string; time_limit_minutes: number | null; pass_score: number }>;
};

function EnrollmentsPage() {
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listPendingEnrollments);
  const reviewFn = useTypedServerFn(reviewEnrollment);
  const assignFn = useTypedServerFn(assignQuizToStudent);
  const { data, isLoading } = useQuery({ queryKey: ["pending-enrollments"], queryFn: () => listFn() });
  const [selectedQuiz, setSelectedQuiz] = useState<Record<string, string>>({});

  const review = useMutation({
    mutationFn: (p: { enrollmentId: string; action: "pending" | "approved" | "rejected" }) => reviewFn(p),
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      qc.invalidateQueries({ queryKey: ["pending-enrollments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: (p: { quizId: string; studentId: string; courseId: string }) => assignFn(p),
    onSuccess: () => {
      toast.success("تم تعيين الامتحان وإشعار الطالب");
      qc.invalidateQueries({ queryKey: ["pending-enrollments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusLabel: Record<string, string> = {
    pending: "قيد الانتظار",
    approved: "مقبول",
    rejected: "مرفوض",
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserCheck className="h-7 w-7 text-primary" /> طلبات التسجيل
      </h1>
      {isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
      {!isLoading && (data?.requests ?? []).length === 0 && (
        <p className="text-muted-foreground">لا توجد طلبات تسجيل.</p>
      )}
      <div className="space-y-3">
        {(data?.requests ?? []).map((r: RequestRow) => {
          const canAssign = r.status === "approved" && (r.progress_pct ?? 0) >= 100 && r.quizzes.length > 0 && r.user_id;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.student ? `${r.student.first_name ?? ""} ${r.student.last_name ?? ""}`.trim() : "طالب"}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.course_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.enrolled_at).toLocaleString("ar-DZ")}
                      {typeof r.progress_pct === "number" ? ` · التقدّم ${r.progress_pct}%` : ""}
                    </p>
                    {r.exam_requested_at && (
                      <Badge variant="outline" className="mt-2 gap-1">
                        <Bell className="h-3 w-3" /> طلب اجتياز امتحان
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={r.status ?? "pending"}
                      onValueChange={(v) =>
                        review.mutate({ enrollmentId: r.id, action: v as "pending" | "approved" | "rejected" })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>{statusLabel[r.status ?? "pending"]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="approved">مقبول</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {canAssign && (
                  <div className="border-t pt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0 hidden sm:block" />
                    <Select
                      value={selectedQuiz[r.id] ?? r.quizzes[0]?.id ?? ""}
                      onValueChange={(v) => setSelectedQuiz((prev) => ({ ...prev, [r.id]: v }))}
                    >
                      <SelectTrigger className="flex-1"><SelectValue placeholder="اختر الامتحان" /></SelectTrigger>
                      <SelectContent>
                        {r.quizzes.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.title}
                            {q.time_limit_minutes ? ` · ${q.time_limit_minutes} د` : ""}
                            {` · ${q.pass_score}%`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() =>
                        assign.mutate({
                          quizId: selectedQuiz[r.id] ?? r.quizzes[0].id,
                          studentId: r.user_id,
                          courseId: r.course_id,
                        })
                      }
                      disabled={assign.isPending}
                    >
                      تعيين الامتحان
                    </Button>
                  </div>
                )}
                {r.status === "approved" && (r.progress_pct ?? 0) >= 100 && r.quizzes.length === 0 && (
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    أنشئ اختباراً من صفحة «نشر الدروس» لتعيينه للطالب.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
