import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listEngagements, upsertEngagement, deleteEngagement, listClients } from "@/lib/professional.functions";

export const Route = createFileRoute("/_authenticated/dashboard/workspace")({
  head: () => ({ meta: [{ title: "مساحة العمل — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: WorkspacePage,
});

const STATUS = [{ v: "active", l: "نشط" }, { v: "paused", l: "موقّف" }, { v: "completed", l: "مكتمل" }, { v: "cancelled", l: "ملغى" }];
const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("fr-DZ") + " دج");

function WorkspacePage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listEngagements);
  const save = useTypedServerFn(upsertEngagement);
  const del = useTypedServerFn(deleteEngagement);
  const lc = useTypedServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["pro_engagements"], queryFn: () => list() });
  const { data: clientsData } = useQuery({ queryKey: ["pro_clients"], queryFn: () => lc() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "active", progress: 0 });

  const mut = useMutation({
    mutationFn: () => save({
      ...form,
      client_id: form.client_id || null,
      progress: Number(form.progress ?? 0),
      fee_dzd: form.fee_dzd ? Number(form.fee_dzd) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ status: "active", progress: 0 }); qc.invalidateQueries({ queryKey: ["pro_engagements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["pro_engagements"] }) });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Briefcase className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">مساحة العمل</h2></div>
        <Button onClick={() => { setForm({ status: "active", progress: 0 }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />مهمة جديدة</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.engagements?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مهام بعد</CardContent></Card>
      : <div className="grid md:grid-cols-2 gap-4">
        {data.engagements.map((e: any) => (
          <Card key={e.id}>
            <CardHeader><CardTitle className="flex items-center justify-between text-base">
              <span>{e.title}</span><Badge>{STATUS.find(s => s.v === e.status)?.l}</Badge>
            </CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {e.pro_clients && <p className="text-sm text-muted-foreground">العميل: {e.pro_clients.full_name}{e.pro_clients.company ? ` — ${e.pro_clients.company}` : ""}</p>}
              {e.engagement_type && <Badge variant="outline">{e.engagement_type}</Badge>}
              <div className="text-sm">الأتعاب: <span className="font-semibold">{fmt(e.fee_dzd)}</span></div>
              <div><div className="flex justify-between text-xs mb-1"><span>التقدم</span><span>{e.progress}%</span></div><Progress value={e.progress} /></div>
              <div className="text-xs text-muted-foreground">{e.start_date ?? "—"} → {e.end_date ?? "—"}</div>
              {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
              <div className="flex gap-1 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(e); setOpen(true); }}>تعديل</Button>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} مهمة</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>العنوان *</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>العميل</Label><Select value={form.client_id ?? ""} onValueChange={v => setForm({ ...form, client_id: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{(clientsData?.clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>النوع</Label><Input value={form.engagement_type ?? ""} onChange={e => setForm({ ...form, engagement_type: e.target.value })} placeholder="تدقيق / استشارة..." className="mt-1" /></div>
              <div><Label>الحالة</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>الأتعاب (دج)</Label><Input type="number" value={form.fee_dzd ?? ""} onChange={e => setForm({ ...form, fee_dzd: e.target.value })} className="mt-1" /></div>
              <div><Label>تاريخ البدء</Label><Input type="date" value={form.start_date ?? ""} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1" /></div>
              <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date ?? ""} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1" /></div>
              <div className="col-span-2"><Label>التقدم: {form.progress ?? 0}%</Label><Input type="range" min={0} max={100} value={form.progress ?? 0} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="mt-1" /></div>
            </div>
            <div><Label>الوصف</Label><Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
