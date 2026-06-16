import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listPeriods, upsertPeriod, deletePeriod } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  head: () => ({ meta: [{ title: "التقارير المالية — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: ReportsPage,
});

const FIELDS = [
  { k: "period_label", label: "الفترة *", type: "text" },
  { k: "period_start", label: "تاريخ البداية *", type: "date" },
  { k: "period_end", label: "تاريخ النهاية *", type: "date" },
  { k: "revenue_dzd", label: "الإيرادات (دج)", type: "number" },
  { k: "cogs_dzd", label: "تكلفة المبيعات (دج)", type: "number" },
  { k: "opex_dzd", label: "المصاريف التشغيلية (دج)", type: "number" },
  { k: "ebitda_dzd", label: "EBITDA (دج)", type: "number" },
  { k: "net_income_dzd", label: "صافي الربح (دج)", type: "number" },
  { k: "cash_dzd", label: "النقدية (دج)", type: "number" },
  { k: "assets_dzd", label: "الأصول (دج)", type: "number" },
  { k: "liabilities_dzd", label: "الخصوم (دج)", type: "number" },
  { k: "equity_dzd", label: "حقوق الملكية (دج)", type: "number" },
  { k: "customers_count", label: "عدد العملاء", type: "number" },
] as const;

const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("fr-DZ"));

function ReportsPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listPeriods);
  const save = useTypedServerFn(upsertPeriod);
  const del = useTypedServerFn(deletePeriod);
  const { data, isLoading } = useQuery({ queryKey: ["periods"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { period_label: form.period_label, period_start: form.period_start, period_end: form.period_end };
      for (const f of FIELDS) {
        if (f.type === "number") payload[f.k] = Number(form[f.k] ?? 0);
      }
      if (form.id) payload.id = form.id;
      return save(payload as never);
    },
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: ["periods"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ id }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["periods"] }); },
  });

  const exportCsv = () => {
    const rows = data?.periods ?? [];
    if (!rows.length) return;
    const headers = ["period_label", ...FIELDS.filter(f => f.k !== "period_label").map(f => f.k)];
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => r[h] ?? "").join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "financial-reports.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><FileText className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">التقارير المالية</h2></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!data?.periods?.length}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
          <Button onClick={() => { setForm({}); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />إضافة فترة</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>الفترات المالية</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : !data?.periods?.length ? <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
            : <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                <TableHead>الفترة</TableHead><TableHead>الإيرادات</TableHead><TableHead>EBITDA</TableHead><TableHead>صافي الربح</TableHead><TableHead>النقدية</TableHead><TableHead></TableHead>
              </TableRow></TableHeader><TableBody>
                {data.periods.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.period_label}</TableCell>
                    <TableCell>{fmt(p.revenue_dzd)}</TableCell>
                    <TableCell>{fmt(p.ebitda_dzd)}</TableCell>
                    <TableCell>{fmt(p.net_income_dzd)}</TableCell>
                    <TableCell>{fmt(p.cash_dzd)}</TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { const f: Record<string,string> = {}; Object.entries(p).forEach(([k,v]) => f[k] = v == null ? "" : String(v)); setForm(f); setOpen(true); }}>تعديل</Button>
                      <Button size="sm" variant="ghost" onClick={() => delMut.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>
          }
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "تعديل فترة" : "إضافة فترة"}</DialogTitle></DialogHeader>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            {FIELDS.map((f) => (
              <div key={f.k}>
                <Label>{f.label}</Label>
                <Input type={f.type} value={form[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className="mt-1" required={f.label.includes("*")} />
              </div>
            ))}
            <DialogFooter className="col-span-2"><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
