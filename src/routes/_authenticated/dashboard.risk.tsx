import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listRisks, upsertRisk, deleteRisk } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/risk")({
  head: () => ({ meta: [{ title: "إدارة المخاطر — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: RiskPage,
});

const LEVELS = [{ v: "low", l: "منخفض" }, { v: "medium", l: "متوسط" }, { v: "high", l: "عالٍ" }, { v: "critical", l: "حرج" }];
const STATUS = [{ v: "open", l: "مفتوح" }, { v: "mitigating", l: "تحت المعالجة" }, { v: "closed", l: "مغلق" }];
const COLOR: Record<string, string> = { low: "bg-green-500/10 text-green-700", medium: "bg-yellow-500/10 text-yellow-700", high: "bg-orange-500/10 text-orange-700", critical: "bg-red-500/10 text-red-700" };

function RiskPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listRisks);
  const save = useTypedServerFn(upsertRisk);
  const del = useTypedServerFn(deleteRisk);
  const { data, isLoading } = useQuery({ queryKey: ["risks"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ likelihood: "medium", impact: "medium", status: "open" });

  const mut = useMutation({
    mutationFn: () => save({ ...form, due_date: form.due_date || null } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ likelihood: "medium", impact: "medium", status: "open" }); qc.invalidateQueries({ queryKey: ["risks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["risks"] }) });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">سجل المخاطر</h2></div>
        <Button onClick={() => { setForm({ likelihood: "medium", impact: "medium", status: "open" }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />مخاطرة جديدة</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.risks?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مخاطر مسجلة</CardContent></Card>
      : <div className="grid gap-3">
        {data.risks.map((r: any) => (
          <Card key={r.id}><CardContent className="pt-6 flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{r.title}</h3>
                {r.category && <Badge variant="outline">{r.category}</Badge>}
                <Badge className={COLOR[r.likelihood]}>احتمال: {LEVELS.find(l => l.v === r.likelihood)?.l}</Badge>
                <Badge className={COLOR[r.impact]}>أثر: {LEVELS.find(l => l.v === r.impact)?.l}</Badge>
                <Badge variant="secondary">{STATUS.find(s => s.v === r.status)?.l}</Badge>
              </div>
              {r.mitigation && <p className="text-sm text-muted-foreground mt-2">{r.mitigation}</p>}
              <div className="text-xs text-muted-foreground mt-1">{r.owner && `المسؤول: ${r.owner}`} {r.due_date && ` • تاريخ: ${r.due_date}`}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} مخاطرة</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>العنوان *</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" /></div>
            <div><Label>الفئة</Label><Input value={form.category ?? ""} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>الاحتمال</Label><Select value={form.likelihood} onValueChange={v => setForm({ ...form, likelihood: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>الأثر</Label><Select value={form.impact} onValueChange={v => setForm({ ...form, impact: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>الحالة</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>خطة المعالجة</Label><Textarea value={form.mitigation ?? ""} onChange={e => setForm({ ...form, mitigation: e.target.value })} className="mt-1" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المسؤول</Label><Input value={form.owner ?? ""} onChange={e => setForm({ ...form, owner: e.target.value })} className="mt-1" /></div>
              <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={form.due_date ?? ""} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1" /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
