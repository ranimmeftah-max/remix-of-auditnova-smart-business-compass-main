import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Gauge,
  Loader2,
  ExternalLink,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { getEvaluationStats, listRecentFeedback } from "@/lib/evaluation.functions";

type RatingFilter = "all" | "positive" | "negative" | "commented";

export function AssistantFeedbackEvaluation() {
  const statsFn = useServerFn(getEvaluationStats);
  const listFn = useServerFn(listRecentFeedback);

  const [q, setQ] = useState("");
  const [rating, setRating] = useState<RatingFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = useMemo(() => {
    const f: { from?: string; to?: string; q?: string; rating?: RatingFilter } = {};
    if (from) f.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) f.to = new Date(`${to}T23:59:59`).toISOString();
    if (q.trim()) f.q = q.trim();
    if (rating !== "all") f.rating = rating;
    return f;
  }, [from, to, q, rating]);

  const statsQ = useQuery({
    queryKey: ["evaluation-stats", filters.from ?? null, filters.to ?? null],
    queryFn: () => statsFn({ data: { from: filters.from, to: filters.to } }),
  });
  const listQ = useQuery({
    queryKey: ["evaluation-list", filters],
    queryFn: () => listFn({ data: filters }),
  });

  const s = statsQ.data;
  const rows = listQ.data ?? [];
  const maxDay = Math.max(1, ...(s?.byDay.map((d) => d.positive + d.negative) ?? [1]));
  const hasFilters = q.trim() !== "" || rating !== "all" || from !== "" || to !== "";

  const resetFilters = () => {
    setQ("");
    setRating("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Gauge className="h-7 w-7 text-primary" />
            تقييمات مساعد AuditNova
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحليل ملاحظاتك على ردود المساعد لتحسين الجودة وضبط نقاط الضعف.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/ai-chat">فتح المساعد</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 space-y-1">
            <Label htmlFor="ev-q" className="text-xs">بحث (رسالة/تعليق/محادثة)</Label>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="ev-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="اكتب كلمة مفتاحية…"
                className="pr-9"
              />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs">نوع التقييم</Label>
            <Select value={rating} onValueChange={(v) => setRating(v as RatingFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="positive">إيجابي 👍</SelectItem>
                <SelectItem value="negative">سلبي 👎</SelectItem>
                <SelectItem value="commented">مع تعليق</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="ev-from" className="text-xs">من تاريخ</Label>
            <Input id="ev-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="ev-to" className="text-xs">إلى تاريخ</Label>
            <Input id="ev-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full gap-1"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              <X className="h-3.5 w-3.5" />
              مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      {statsQ.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : statsQ.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            تعذّر تحميل الإحصاءات: {(statsQ.error as Error).message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="نسبة الرضا" value={s?.satisfaction != null ? `${s.satisfaction}%` : "—"} hint={`${s?.totalFeedback ?? 0} تقييم مسجّل`} icon={<Gauge className="h-5 w-5" />} accent="primary" />
            <StatCard label="ردود إيجابية" value={String(s?.positive ?? 0)} hint="إعجاب 👍" icon={<ThumbsUp className="h-5 w-5" />} accent="success" />
            <StatCard label="ردود سلبية" value={String(s?.negative ?? 0)} hint="عدم إعجاب 👎" icon={<ThumbsDown className="h-5 w-5" />} accent="destructive" />
            <StatCard label="مع تعليقات" value={String(s?.withComments ?? 0)} hint={`من أصل ${s?.totalMessages ?? 0} رد مساعد`} icon={<MessageSquare className="h-5 w-5" />} accent="muted" />
          </div>

          {s && s.satisfaction != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">مؤشر الرضا الإجمالي</CardTitle>
                <CardDescription>نسبة الردود الإيجابية من إجمالي تقييماتك.</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={s.satisfaction} className="h-3" />
                <div className="text-xs text-muted-foreground mt-2">{s.satisfaction}%</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">آخر 14 يوماً</CardTitle>
              <CardDescription>توزيع التقييمات اليومية.</CardDescription>
            </CardHeader>
            <CardContent>
              {(s?.byDay ?? []).every((d) => d.positive + d.negative === 0) ? (
                <EmptyHint text="لا توجد تقييمات في هذه الفترة." />
              ) : (
                <div className="flex items-end gap-1.5 h-32" dir="ltr">
                  {(s?.byDay ?? []).map((d) => {
                    const total = d.positive + d.negative;
                    const h = (total / maxDay) * 100;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date} — 👍 ${d.positive} / 👎 ${d.negative}`}>
                        <div className="w-full flex flex-col-reverse rounded-md overflow-hidden bg-muted" style={{ height: `${Math.max(h, 4)}%` }}>
                          {d.positive > 0 && (<div className="bg-emerald-500" style={{ flex: d.positive }} />)}
                          {d.negative > 0 && (<div className="bg-destructive" style={{ flex: d.negative }} />)}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate w-full text-center">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">آخر التقييمات</CardTitle>
          <CardDescription>أحدث 50 ملاحظة سجلتها على ردود المساعد.</CardDescription>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyHint text="لم تُقيّم أي رد بعد. ابدأ بتقييم ردود المساعد لتحسين الجودة." />
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex gap-3">
                  <div className="shrink-0">
                    {r.rating === 1 ? (
                      <span className="inline-flex h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 items-center justify-center">
                        <ThumbsUp className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-9 w-9 rounded-full bg-destructive/10 text-destructive items-center justify-center">
                        <ThumbsDown className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{r.thread_title}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.updated_at).toLocaleString("ar-DZ")}
                      </span>
                    </div>
                    {r.message_snippet && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.message_snippet}</p>
                    )}
                    {r.comment && (
                      <p className="text-sm border-r-2 border-primary/50 pr-3 mt-1">{r.comment}</p>
                    )}
                  </div>
                  {r.thread_id && (
                    <Link to="/dashboard/ai-chat/$threadId" params={{ threadId: r.thread_id }} className="shrink-0 self-start inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      فتح
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint, icon, accent }: { label: string; value: string; hint: string; icon: React.ReactNode; accent: "primary" | "success" | "destructive" | "muted"; }) {
  const accentClass =
    accent === "success" ? "bg-emerald-500/10 text-emerald-600"
      : accent === "destructive" ? "bg-destructive/10 text-destructive"
      : accent === "primary" ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accentClass}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
      <Inbox className="h-6 w-6 opacity-60" />
      <span>{text}</span>
    </div>
  );
}
