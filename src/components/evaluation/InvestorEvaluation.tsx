import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Briefcase, Loader2, Plus, TrendingUp, CheckCircle2, Gauge, Wallet, Search, X, Trash2, Pencil, Inbox, Bot, Download, Share2,
} from "lucide-react";
import { analyzeOpportunityWithAi, exportOpportunityPdfData, shareOpportunity } from "@/lib/tax.functions";
import { exportOpportunityPdf } from "@/lib/tax/export-opportunity-pdf";
import {
  listOpportunities,
  getInvestorStats,
  upsertOpportunity,
  deleteOpportunity,
  type OpportunityRow,
  type UpsertOpportunityInput,
} from "@/lib/opportunities.functions";

type Recommendation = "go" | "hold" | "no_go" | "pending";
type Status = "screening" | "due_diligence" | "negotiation" | "closed" | "passed";

const RECO_LABEL: Record<Recommendation, string> = {
  go: "موافقة",
  hold: "تعليق",
  no_go: "رفض",
  pending: "قيد المراجعة",
};

const STATUS_LABEL: Record<Status, string> = {
  screening: "فرز أولي",
  due_diligence: "فحص نافي",
  negotiation: "تفاوض",
  closed: "مغلقة",
  passed: "مرفوضة",
};

const STAGES = ["Seed", "Series A", "Series B", "Growth", "Mature"];

const dzd = new Intl.NumberFormat("ar-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

export function InvestorEvaluation() {
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listOpportunities);
  const statsFn = useTypedServerFn(getInvestorStats);
  const upsertFn = useTypedServerFn(upsertOpportunity);
  const deleteFn = useTypedServerFn(deleteOpportunity);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [reco, setReco] = useState<Recommendation | "all">("all");
  const [editing, setEditing] = useState<OpportunityRow | null>(null);
  const [open, setOpen] = useState(false);

  const filters = useMemo(() => {
    const f: { q?: string; status?: Status; recommendation?: Recommendation } = {};
    if (q.trim()) f.q = q.trim();
    if (status !== "all") f.status = status;
    if (reco !== "all") f.recommendation = reco;
    return f;
  }, [q, status, reco]);

  const statsQ = useQuery({ queryKey: ["inv-stats"], queryFn: () => statsFn() });
  const listQ = useQuery({ queryKey: ["inv-list", filters], queryFn: () => listFn(filters) });

  const upsertM = useMutation({
    mutationFn: (payload: UpsertOpportunityInput) => upsertFn(payload),
    onSuccess: () => {
      toast.success("تم حفظ الفرصة");
      qc.invalidateQueries({ queryKey: ["inv-list"] });
      qc.invalidateQueries({ queryKey: ["inv-stats"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر الحفظ"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ id }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["inv-list"] });
      qc.invalidateQueries({ queryKey: ["inv-stats"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذّر الحذف"),
  });

  const s = statsQ.data;
  const rows = listQ.data ?? [];
  const hasFilters = q.trim() !== "" || status !== "all" || reco !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            تقييم فرص الاستثمار
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            أدر محفظتك من الفرص: درجات الجاهزية، التوصيات، وحجم الصفقات.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              فرصة جديدة
            </Button>
          </DialogTrigger>
          <OpportunityDialog
            initial={editing}
            onSubmit={(v) => upsertM.mutate(v)}
            submitting={upsertM.isPending}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="عدد الفرص" value={String(s?.total ?? 0)} hint="إجمالي محفظتك" icon={<Briefcase className="h-5 w-5" />} accent="primary" />
        <StatCard label="توصيات إيجابية" value={String(s?.go ?? 0)} hint="Go ✅" icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="متوسط الجاهزية" value={s?.avgScore != null ? `${s.avgScore}/100` : "—"} hint="عبر كل الفرص" icon={<Gauge className="h-5 w-5" />} accent="muted" />
        <StatCard label="حجم الصفقات" value={s ? dzd.format(s.totalTicket) : "—"} hint="مجموع تذاكر الاستثمار" icon={<Wallet className="h-5 w-5" />} accent="primary" />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 space-y-1">
            <Label htmlFor="iv-q" className="text-xs">بحث (شركة / قطاع / وصف)</Label>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input id="iv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتب كلمة مفتاحية…" className="pr-9" />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs">الحالة</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs">التوصية</Label>
            <Select value={reco} onValueChange={(v) => setReco(v as Recommendation | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(RECO_LABEL) as Recommendation[]).map((k) => (
                  <SelectItem key={k} value={k}>{RECO_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button type="button" variant="ghost" size="sm" className="w-full gap-1" onClick={() => { setQ(""); setStatus("all"); setReco("all"); }} disabled={!hasFilters}>
              <X className="h-3.5 w-3.5" />
              مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      {listQ.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
              <Inbox className="h-8 w-8 opacity-60" />
              <span>لا توجد فرص حالياً. أضف أوّل فرصة لبدء التقييم.</span>
              <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> أضف فرصة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((r) => (
            <OpportunityCard
              key={r.id}
              row={r}
              onEdit={() => { setEditing(r); setOpen(true); }}
              onDelete={() => {
                if (confirm(`حذف فرصة "${r.company_name}" نهائياً؟`)) deleteM.mutate(r.id);
              }}
            />
          ))}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground text-center">
        <TrendingUp className="inline h-3 w-3 mr-1" />
        استخدم «حلّل بالـ AI» أو «PDF» أو «مشاركة» من كل بطاقة فرصة.
      </div>
    </div>
  );
}

function OpportunityCard({ row, onEdit, onDelete }: { row: OpportunityRow; onEdit: () => void; onDelete: () => void; }) {
  const analyzeFn = useTypedServerFn(analyzeOpportunityWithAi);
  const exportFn = useTypedServerFn(exportOpportunityPdfData);
  const shareFn = useTypedServerFn(shareOpportunity);

  const analyzeM = useMutation({
    mutationFn: () => analyzeFn({ id: row.id }),
    onSuccess: (d) => {
      toast.success("تم فتح محادثة تحليل");
      window.location.href = `/dashboard/ai-chat/${d.threadId}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pdfM = useMutation({
    mutationFn: () => exportFn({ id: row.id }),
    onSuccess: (d) => {
      exportOpportunityPdf(d.opportunity as Parameters<typeof exportOpportunityPdf>[0]);
      toast.success("تم تصدير PDF");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareM = useMutation({
    mutationFn: (peerId: string) => shareFn({ opportunityId: row.id, sharedWith: peerId }),
    onSuccess: () => toast.success("تمت المشاركة"),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleShare = () => {
    const peerId = prompt("UUID المستخدم للمشاركة معه:");
    if (peerId?.trim()) shareM.mutate(peerId.trim());
  };
  const reco = row.recommendation;
  const recoColor =
    reco === "go" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
    : reco === "no_go" ? "bg-destructive/15 text-destructive border-destructive/30"
    : reco === "hold" ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
    : "bg-muted text-muted-foreground border-border";

  const score = row.score_overall != null ? Math.round(Number(row.score_overall)) : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{row.company_name}</CardTitle>
            <CardDescription className="text-xs truncate">
              {[row.sector, row.stage].filter(Boolean).join(" • ") || "—"}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`shrink-0 ${recoColor}`}>{RECO_LABEL[reco]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">درجة الجاهزية</span>
          <span className="font-semibold">{score != null ? `${score}/100` : "—"}</span>
        </div>
        <Progress value={score ?? 0} className="h-2" />

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div>
            <div className="text-muted-foreground">تذكرة الاستثمار</div>
            <div className="font-medium">{row.ticket_size_dzd != null ? dzd.format(Number(row.ticket_size_dzd)) : "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">التقييم</div>
            <div className="font-medium">{row.valuation_dzd != null ? dzd.format(Number(row.valuation_dzd)) : "—"}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[row.status]}</Badge>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" title="حلّل بالـ AI" onClick={() => analyzeM.mutate()} disabled={analyzeM.isPending}>
              <Bot className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" title="PDF" onClick={() => pdfM.mutate()} disabled={pdfM.isPending}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" title="مشاركة" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityDialog({
  initial,
  onSubmit,
  submitting,
}: {
  initial: OpportunityRow | null;
  onSubmit: (v: UpsertOpportunityInput) => void;
  submitting: boolean;
}) {
  const [companyName, setCompanyName] = useState(initial?.company_name ?? "");
  const [sector, setSector] = useState(initial?.sector ?? "");
  const [stage, setStage] = useState(initial?.stage ?? "");
  const [wilayaCode, setWilayaCode] = useState<string>(initial?.wilaya_code != null ? String(initial.wilaya_code) : "");
  const [ticket, setTicket] = useState<string>(initial?.ticket_size_dzd != null ? String(initial.ticket_size_dzd) : "");
  const [valuation, setValuation] = useState<string>(initial?.valuation_dzd != null ? String(initial.valuation_dzd) : "");
  const [revenue, setRevenue] = useState<string>(initial?.revenue_dzd != null ? String(initial.revenue_dzd) : "");
  const [ebitda, setEbitda] = useState<string>(initial?.ebitda_dzd != null ? String(initial.ebitda_dzd) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [sFin, setSFin] = useState<number>(initial?.score_financial ?? 50);
  const [sLeg, setSLeg] = useState<number>(initial?.score_legal ?? 50);
  const [sMkt, setSMkt] = useState<number>(initial?.score_market ?? 50);
  const [sRsk, setSRsk] = useState<number>(initial?.score_risk ?? 50);
  const [sTm, setSTm] = useState<number>(initial?.score_team ?? 50);
  const [reco, setReco] = useState<Recommendation>(initial?.recommendation ?? "pending");
  const [status, setStatus] = useState<Status>(initial?.status ?? "screening");

  const numOrNull = (s: string) => {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("اسم الشركة مطلوب");
      return;
    }
    onSubmit({
      id: initial?.id,
      company_name: companyName.trim(),
      sector: sector.trim() || null,
      stage: stage || null,
      wilaya_code: wilayaCode ? Number(wilayaCode) : null,
      ticket_size_dzd: numOrNull(ticket),
      valuation_dzd: numOrNull(valuation),
      revenue_dzd: numOrNull(revenue),
      ebitda_dzd: numOrNull(ebitda),
      description: description.trim() || null,
      notes: notes.trim() || null,
      score_financial: sFin,
      score_legal: sLeg,
      score_market: sMkt,
      score_risk: sRsk,
      score_team: sTm,
      recommendation: reco,
      status,
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
      <DialogHeader>
        <DialogTitle>{initial ? "تعديل الفرصة" : "فرصة استثمار جديدة"}</DialogTitle>
        <DialogDescription>سجّل بيانات الشركة وقيّم درجة جاهزيتها للاستثمار.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="اسم الشركة *">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={255} required />
          </Field>
          <Field label="القطاع">
            <Input value={sector} onChange={(e) => setSector(e.target.value)} maxLength={120} placeholder="تقنية، صناعة، خدمات…" />
          </Field>
          <Field label="المرحلة">
            <Select value={stage || undefined} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="اختر…" /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="رمز الولاية (1-58)">
            <Input type="number" min={1} max={58} value={wilayaCode} onChange={(e) => setWilayaCode(e.target.value)} />
          </Field>
          <Field label="تذكرة الاستثمار (DZD)">
            <Input type="number" min={0} value={ticket} onChange={(e) => setTicket(e.target.value)} />
          </Field>
          <Field label="تقييم الشركة (DZD)">
            <Input type="number" min={0} value={valuation} onChange={(e) => setValuation(e.target.value)} />
          </Field>
          <Field label="الإيراد السنوي (DZD)">
            <Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </Field>
          <Field label="EBITDA (DZD)">
            <Input type="number" value={ebitda} onChange={(e) => setEbitda(e.target.value)} />
          </Field>
        </div>

        <Field label="وصف الفرصة">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={3} />
        </Field>

        <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
          <div className="text-sm font-semibold">درجات الجاهزية (0-100)</div>
          <ScoreRow label="مالي" value={sFin} onChange={setSFin} />
          <ScoreRow label="قانوني" value={sLeg} onChange={setSLeg} />
          <ScoreRow label="سوق" value={sMkt} onChange={setSMkt} />
          <ScoreRow label="مخاطر" value={sRsk} onChange={setSRsk} />
          <ScoreRow label="فريق" value={sTm} onChange={setSTm} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="التوصية">
            <Select value={reco} onValueChange={(v) => setReco(v as Recommendation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RECO_LABEL) as Recommendation[]).map((k) => (
                  <SelectItem key={k} value={k}>{RECO_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="ملاحظات خاصة">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} rows={2} />
        </Field>

        <DialogFooter>
          <Button type="submit" disabled={submitting} className="gap-1">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void; }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <div className="col-span-3 text-sm text-muted-foreground">{label}</div>
      <div className="col-span-7" dir="ltr">
        <Slider min={0} max={100} step={5} value={[value]} onValueChange={(v) => onChange(v[0] ?? 0)} />
      </div>
      <div className="col-span-2 text-sm font-medium text-center">{value}</div>
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
          <div className="text-lg font-bold leading-tight truncate">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}
