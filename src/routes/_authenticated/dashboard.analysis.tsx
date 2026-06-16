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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listAnalyses, upsertAnalysis, deleteAnalysis, listClients } from "@/lib/professional.functions";

export const Route = createFileRoute("/_authenticated/dashboard/analysis")({
  head: () => ({ meta: [{ title: "التحليلات — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: AnalysisPage,
});

const TYPES = ["مالي", "تشغيلي", "سوق", "مخاطر", "أداء", "ضريبي"];

function AnalysisPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listAnalyses);
  const save = useTypedServerFn(upsertAnalysis);
  const del = useTypedServerFn(deleteAnalysis);
  const lc = useTypedServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["pro_analyses"], queryFn: () => list() });
  const { data: clientsData } = useQuery({ queryKey: ["pro_clients"], queryFn: () => lc() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const mut = useMutation({
    mutationFn: () => save({
      ...form,
      client_id: form.client_id || null,
      score: form.score !== "" && form.score != null ? Number(form.score) : null,
      data: form.data ?? {},
    } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: ["pro_analyses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["pro_analyses"] }) });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><TrendingUp className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">التحليلات</h2></div>
        <Button onClick={() => { setForm({}); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />تحليل جديد</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.analyses?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد تحليلات بعد</CardContent></Card>
      : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.analyses.map((a: any) => (
          <Card key={a.id}>
            <CardHeader><CardTitle className="text-base flex justify-between items-start gap-2">
              <span className="line-clamp-2">{a.title}</span>
              {a.score != null && <Badge variant="secondary">{a.score}</Badge>}
            </CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {a.analysis_type && <Badge variant="outline">{a.analysis_type}</Badge>}
              {a.pro_clients && <p className="text-xs text-muted-foreground">العميل: {a.pro_clients.full_name}</p>}
              {a.summary && <p className="text-sm text-muted-foreground line-clamp-3">{a.summary}</p>}
              <div className="flex gap-1 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(a); setOpen(true); }}>تعديل</Button>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} تحليل</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>العنوان *</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>النوع</Label><Select value={form.analysis_type ?? ""} onValueChange={v => setForm({ ...form, analysis_type: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>العميل</Label><Select value={form.client_id ?? ""} onValueChange={v => setForm({ ...form, client_id: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{(clientsData?.clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>النتيجة (0-100)</Label><Input type="number" min={0} max={100} value={form.score ?? ""} onChange={e => setForm({ ...form, score: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>الملخص</Label><Textarea value={form.summary ?? ""} onChange={e => setForm({ ...form, summary: e.target.value })} rows={5} className="mt-1" /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
