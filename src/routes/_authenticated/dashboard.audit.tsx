import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Bot, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listAudits, upsertAudit, deleteAudit } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/audit")({
  head: () => ({ meta: [{ title: "مساعد التدقيق — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: AuditPage,
});

const SEV = ["info", "low", "medium", "high", "critical"];
const SEV_COLOR: Record<string, string> = { info: "bg-blue-500/10 text-blue-700", low: "bg-green-500/10 text-green-700", medium: "bg-yellow-500/10 text-yellow-700", high: "bg-orange-500/10 text-orange-700", critical: "bg-red-500/10 text-red-700" };

function AuditPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listAudits);
  const save = useTypedServerFn(upsertAudit);
  const del = useTypedServerFn(deleteAudit);
  const { data, isLoading } = useQuery({ queryKey: ["audits"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ findings: [], score: 70 });
  const [newSev, setNewSev] = useState("medium");
  const [newText, setNewText] = useState("");

  const mut = useMutation({
    mutationFn: () => save({ ...form, score: form.score ? Number(form.score) : null } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ findings: [], score: 70 }); qc.invalidateQueries({ queryKey: ["audits"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["audits"] }) });

  const addFinding = () => {
    if (!newText.trim()) return;
    setForm({ ...form, findings: [...(form.findings ?? []), { severity: newSev, text: newText.trim() }] });
    setNewText("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Bot className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">تقارير التدقيق</h2></div>
        <Button onClick={() => { setForm({ findings: [], score: 70 }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />تقرير جديد</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !data?.audits?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد تقارير</CardContent></Card>
      : <div className="grid gap-4">
        {data.audits.map((a: any) => (
          <Card key={a.id}><CardHeader><CardTitle className="flex items-center justify-between text-base">
            <span>{a.title} {a.period_label && <span className="text-sm text-muted-foreground">({a.period_label})</span>}</span>
            <div className="flex items-center gap-2"><Badge variant="outline">الدرجة: {a.score ?? "—"}</Badge>
              <Button size="sm" variant="ghost" onClick={() => { setForm(a); setOpen(true); }}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => delMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardTitle></CardHeader><CardContent>
            {a.summary && <p className="text-sm text-muted-foreground mb-3">{a.summary}</p>}
            <div className="space-y-1">
              {(a.findings ?? []).map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge className={SEV_COLOR[f.severity] ?? ""}>{f.severity}</Badge>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        ))}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} تقرير تدقيق</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>العنوان *</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الفترة</Label><Input value={form.period_label ?? ""} onChange={e => setForm({ ...form, period_label: e.target.value })} className="mt-1" /></div>
              <div><Label>الدرجة (0-100)</Label><Input type="number" min={0} max={100} value={form.score ?? ""} onChange={e => setForm({ ...form, score: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>الملخص</Label><Textarea value={form.summary ?? ""} onChange={e => setForm({ ...form, summary: e.target.value })} rows={3} className="mt-1" /></div>
            <div>
              <Label>النتائج</Label>
              <div className="flex gap-2 mt-1">
                <Select value={newSev} onValueChange={setNewSev}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{SEV.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder="نص النتيجة" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFinding(); } }} />
                <Button type="button" onClick={addFinding}>إضافة</Button>
              </div>
              <div className="mt-2 space-y-1">
                {(form.findings ?? []).map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                    <Badge className={SEV_COLOR[f.severity] ?? ""}>{f.severity}</Badge>
                    <span className="flex-1">{f.text}</span>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setForm({ ...form, findings: form.findings.filter((_: any, j: number) => j !== i) })}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
