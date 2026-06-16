import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listRounds, upsertRound, deleteRound } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/investment")({
  head: () => ({ meta: [{ title: "الجاهزية الاستثمارية — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: InvestmentPage,
});

const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("fr-DZ") + " دج");

function InvestmentPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listRounds);
  const save = useTypedServerFn(upsertRound);
  const del = useTypedServerFn(deleteRound);
  const { data, isLoading } = useQuery({ queryKey: ["rounds"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "open", raised_amount_dzd: 0 });

  const mut = useMutation({
    mutationFn: () => save({
      ...form,
      target_amount_dzd: form.target_amount_dzd ? Number(form.target_amount_dzd) : null,
      raised_amount_dzd: Number(form.raised_amount_dzd ?? 0),
      pre_money_dzd: form.pre_money_dzd ? Number(form.pre_money_dzd) : null,
      open_date: form.open_date || null,
      close_date: form.close_date || null,
    } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ status: "open", raised_amount_dzd: 0 }); qc.invalidateQueries({ queryKey: ["rounds"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds"] }) });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><TrendingUp className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">جولات الاستثمار</h2></div>
        <Button onClick={() => { setForm({ status: "open", raised_amount_dzd: 0 }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />جولة جديدة</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.rounds?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد جولات</CardContent></Card>
      : <div className="grid md:grid-cols-2 gap-4">
        {data.rounds.map((r: any) => {
          const pct = r.target_amount_dzd ? Math.min(100, Math.round((Number(r.raised_amount_dzd) / Number(r.target_amount_dzd)) * 100)) : 0;
          return <Card key={r.id}><CardHeader><CardTitle className="flex items-center justify-between text-base">
            <span>{r.round_name}</span><Badge variant={r.status === "closed" ? "secondary" : "default"}>{r.status}</Badge>
          </CardTitle></CardHeader><CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">الهدف: {fmt(r.target_amount_dzd)}</div>
            <div className="text-sm">تم جمع: <span className="font-semibold">{fmt(r.raised_amount_dzd)}</span></div>
            {r.target_amount_dzd && <Progress value={pct} />}
            <div className="text-xs text-muted-foreground">تقييم قبل: {fmt(r.pre_money_dzd)}</div>
            <div className="text-xs text-muted-foreground">{r.open_date} → {r.close_date ?? "—"}</div>
            {r.notes && <p className="text-sm">{r.notes}</p>}
            <div className="flex gap-1 pt-2">
              <Button size="sm" variant="outline" onClick={() => { setForm(r); setOpen(true); }}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>;
        })}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} جولة</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>اسم الجولة *</Label><Input value={form.round_name ?? ""} onChange={e => setForm({ ...form, round_name: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المبلغ المستهدف (دج)</Label><Input type="number" value={form.target_amount_dzd ?? ""} onChange={e => setForm({ ...form, target_amount_dzd: e.target.value })} className="mt-1" /></div>
              <div><Label>المبلغ المُجمع (دج)</Label><Input type="number" value={form.raised_amount_dzd ?? ""} onChange={e => setForm({ ...form, raised_amount_dzd: e.target.value })} className="mt-1" /></div>
              <div><Label>تقييم قبل (دج)</Label><Input type="number" value={form.pre_money_dzd ?? ""} onChange={e => setForm({ ...form, pre_money_dzd: e.target.value })} className="mt-1" /></div>
              <div><Label>الحالة</Label><Input value={form.status ?? ""} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1" /></div>
              <div><Label>تاريخ الفتح</Label><Input type="date" value={form.open_date ?? ""} onChange={e => setForm({ ...form, open_date: e.target.value })} className="mt-1" /></div>
              <div><Label>تاريخ الإغلاق</Label><Input type="date" value={form.close_date ?? ""} onChange={e => setForm({ ...form, close_date: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
