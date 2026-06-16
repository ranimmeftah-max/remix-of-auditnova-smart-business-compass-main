import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Scale, CheckCircle2, XCircle, AlertCircle, MinusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listCompliance, upsertCompliance, deleteCompliance, listClients } from "@/lib/professional.functions";

export const Route = createFileRoute("/_authenticated/dashboard/compliance")({
  head: () => ({ meta: [{ title: "الامتثال — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: CompliancePage,
});

const FRAMEWORKS = ["SCF", "IFRS", "ISO 27001", "ISO 9001", "RGPD", "AML", "ضرائب"];
const STATUS = [
  { v: "pending", l: "قيد المراجعة", c: "bg-yellow-500/10 text-yellow-700", I: AlertCircle },
  { v: "compliant", l: "مطابق", c: "bg-green-500/10 text-green-700", I: CheckCircle2 },
  { v: "non_compliant", l: "غير مطابق", c: "bg-red-500/10 text-red-700", I: XCircle },
  { v: "not_applicable", l: "لا ينطبق", c: "bg-gray-500/10 text-gray-700", I: MinusCircle },
];
const SEVERITY = [{ v: "low", l: "منخفض" }, { v: "medium", l: "متوسط" }, { v: "high", l: "عالٍ" }, { v: "critical", l: "حرج" }];

function CompliancePage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listCompliance);
  const save = useTypedServerFn(upsertCompliance);
  const del = useTypedServerFn(deleteCompliance);
  const lc = useTypedServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["pro_compliance"], queryFn: () => list() });
  const { data: clientsData } = useQuery({ queryKey: ["pro_clients"], queryFn: () => lc() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "pending", severity: "medium" });

  const score = useMemo(() => {
    const arr = data?.checks ?? [];
    const applicable = arr.filter((c: any) => c.status !== "not_applicable");
    if (!applicable.length) return 0;
    const ok = applicable.filter((c: any) => c.status === "compliant").length;
    return Math.round((ok / applicable.length) * 100);
  }, [data]);

  const mut = useMutation({
    mutationFn: () => save({
      ...form,
      client_id: form.client_id || null,
      reviewed_at: form.status === "pending" ? null : new Date().toISOString(),
    } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ status: "pending", severity: "medium" }); qc.invalidateQueries({ queryKey: ["pro_compliance"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["pro_compliance"] }) });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Scale className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">سجل الامتثال</h2></div>
        <Button onClick={() => { setForm({ status: "pending", severity: "medium" }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />فحص جديد</Button>
      </div>

      <Card><CardContent className="pt-6 space-y-2">
        <div className="flex justify-between text-sm"><span>نسبة الامتثال الإجمالية</span><span className="font-bold">{score}%</span></div>
        <Progress value={score} />
      </CardContent></Card>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.checks?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد فحوصات بعد</CardContent></Card>
      : <div className="grid gap-3">
        {data.checks.map((c: any) => {
          const st = STATUS.find(s => s.v === c.status);
          const Icon = st?.I ?? AlertCircle;
          return <Card key={c.id}><CardContent className="pt-6 flex justify-between items-start gap-3">
            <div className="flex gap-3 flex-1">
              <Icon className={`h-5 w-5 mt-1 ${st?.c.split(' ')[1]}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{c.item}</h3>
                  <Badge variant="outline">{c.framework}</Badge>
                  <Badge className={st?.c}>{st?.l}</Badge>
                  <Badge variant="secondary">{SEVERITY.find(s => s.v === c.severity)?.l}</Badge>
                </div>
                {c.pro_clients && <p className="text-xs text-muted-foreground mt-1">العميل: {c.pro_clients.full_name}</p>}
                {c.notes && <p className="text-sm text-muted-foreground mt-2">{c.notes}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setForm(c); setOpen(true); }}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => delMut.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>;
        })}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} فحص</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المعيار *</Label><Select value={form.framework ?? ""} onValueChange={v => setForm({ ...form, framework: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent>{FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>العميل</Label><Select value={form.client_id ?? ""} onValueChange={v => setForm({ ...form, client_id: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{(clientsData?.clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>البند *</Label><Input value={form.item ?? ""} onChange={e => setForm({ ...form, item: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الحالة</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>الخطورة</Label><Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{SEVERITY.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
