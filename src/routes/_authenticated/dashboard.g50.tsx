import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Calculator, Download, FileSpreadsheet, Loader2, Plus, Save, Sparkles, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getCompany } from "@/lib/enterprise.functions";
import {
  computeG50, getMockG50Data, listG50Declarations, saveG50Declaration,
} from "@/lib/tax.functions";
import type { G50Input, G50Result, TvaLineInput, PayrollInput } from "@/lib/tax/calculations";
import { sanitizeG50Lines } from "@/lib/tax/calculations";
import { exportG50Excel, exportG50Pdf } from "@/lib/tax/export-g50-pdf";

export const Route = createFileRoute("/_authenticated/dashboard/g50")({
  head: () => ({ meta: [{ title: "تصريح G50 — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: G50Page,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);

const emptyTva = (): TvaLineInput => ({ label: "", baseHt: 0, rateKey: "standard", type: "collectee" });
const emptyPayroll = (): PayrollInput => ({ employeeName: "", grossSalary: 0 });

function G50Page() {
  const qc = useQueryClient();
  const getCo = useTypedServerFn(getCompany);
  const compute = useTypedServerFn(computeG50);
  const save = useTypedServerFn(saveG50Declaration);
  const mockFn = useTypedServerFn(getMockG50Data);
  const listFn = useTypedServerFn(listG50Declarations);

  const { data: companyData } = useQuery({ queryKey: ["company"], queryFn: () => getCo() });
  const { data: listData } = useQuery({ queryKey: ["g50-list"], queryFn: () => listFn() });

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tvaLines, setTvaLines] = useState<TvaLineInput[]>([]);
  const [payrollLines, setPayrollLines] = useState<PayrollInput[]>([]);
  const [tapActivity, setTapActivity] = useState<"production" | "services">("services");
  const [tapBase, setTapBase] = useState(0);
  const [ibsRegime, setIbsRegime] = useState<"standard" | "production">("standard");
  const [ibsBase, setIbsBase] = useState(0);
  const [previousIbs, setPreviousIbs] = useState(0);
  const [result, setResult] = useState<G50Result | null>(null);

  const buildPayload = () => {
    const cleaned = sanitizeG50Lines({ tvaLines, payrollLines });
    return {
      year,
      month,
      ...cleaned,
      tapActivity,
      tapBase,
      ibsRegime,
      ibsBase,
      previousIbsAnnual: previousIbs || undefined,
    };
  };

  const calcMut = useMutation({
    mutationFn: () => compute(buildPayload() as never),
    onSuccess: (d) => { setResult(d.result); toast.success("تم حساب التصريح"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () => save(buildPayload() as never),
    onSuccess: (d) => {
      setResult(d.result);
      toast.success("تم حفظ التصريح");
      qc.invalidateQueries({ queryKey: ["g50-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mockMut = useMutation({
    mutationFn: () => mockFn(),
    onSuccess: (d) => {
      const i = d.input as G50Input;
      setYear(i.year);
      setMonth(i.month);
      setTvaLines(i.tvaLines);
      setPayrollLines(i.payrollLines);
      setTapActivity(i.tapActivity);
      setTapBase(i.tapBase);
      setIbsRegime(i.ibsRegime);
      setIbsBase(i.ibsBase);
      setPreviousIbs(i.previousIbsAnnual ?? 0);
      setResult(d.result);
      toast.success("تم تحميل بيانات تجريبية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const company = companyData?.company ?? {};

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" />
            تصريح G50 الشهري
          </h1>
          <p className="text-muted-foreground text-sm mt-1">TVA + IRG + TAP + acompte IBS — حسابات برمجية دقيقة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mockMut.mutate()} disabled={mockMut.isPending}>
            <Sparkles className="h-4 w-4 ml-1" /> بيانات تجريبية
          </Button>
          <Button variant="outline" onClick={() => calcMut.mutate()} disabled={calcMut.isPending}>
            {calcMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4 ml-1" />}
            احسب
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-4 w-4 ml-1" /> حفظ
          </Button>
        </div>
      </div>

      {result && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">TVA nette</p><p className="text-xl font-bold">{fmt(Math.max(0, result.tva.net))}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">IRG salaires</p><p className="text-xl font-bold">{fmt(result.payroll.totalIrg)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">TAP</p><p className="text-xl font-bold">{fmt(result.tap.amount)}</p></CardContent></Card>
          <Card className="border-primary"><CardContent className="pt-4"><p className="text-xs text-muted-foreground">المجموع المستحق</p><p className="text-xl font-bold text-primary">{fmt(result.totalDue)}</p><Badge variant="secondary" className="mt-1">آجال: {result.deadline}</Badge></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>الفترة</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div><Label>السنة</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1" /></div>
          <div><Label>الشهر</Label><Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>TVA</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setTvaLines([...tvaLines, emptyTva()])}><Plus className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tvaLines.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد بنود TVA. اضغط + أو استخدم «بيانات تجريبية».</p>
          )}
          {tvaLines.map((line, i) => (
            <div key={i} className="grid md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2"><Label>الوصف</Label><Input value={line.label} onChange={(e) => { const n = [...tvaLines]; n[i] = { ...line, label: e.target.value }; setTvaLines(n); }} className="mt-1" /></div>
              <div><Label>Base HT</Label><Input type="number" value={line.baseHt || ""} onChange={(e) => { const n = [...tvaLines]; n[i] = { ...line, baseHt: Number(e.target.value) }; setTvaLines(n); }} className="mt-1" /></div>
              <div><Label>Taux</Label>
                <Select value={line.rateKey} onValueChange={(v) => { const n = [...tvaLines]; n[i] = { ...line, rateKey: v as TvaLineInput["rateKey"] }; setTvaLines(n); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="standard">19%</SelectItem><SelectItem value="reduced">9%</SelectItem><SelectItem value="exempt">0%</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Select value={line.type} onValueChange={(v) => { const n = [...tvaLines]; n[i] = { ...line, type: v as "collectee" | "deductible" }; setTvaLines(n); }}>
                  <SelectTrigger className="mt-6"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="collectee">Collectée</SelectItem><SelectItem value="deductible">Déductible</SelectItem></SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="mt-6" onClick={() => setTvaLines(tvaLines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>الأجور (IRG + CNAS)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPayrollLines([...payrollLines, emptyPayroll()])}><Plus className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {payrollLines.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد أجور. اضغط + أو استخدم «بيانات تجريبية».</p>
          )}
          {payrollLines.map((line, i) => (
            <div key={i} className="grid md:grid-cols-4 gap-2 items-end">
              <div><Label>الاسم</Label><Input value={line.employeeName} onChange={(e) => { const n = [...payrollLines]; n[i] = { ...line, employeeName: e.target.value }; setPayrollLines(n); }} className="mt-1" /></div>
              <div><Label>Matricule</Label><Input value={line.matricule ?? ""} onChange={(e) => { const n = [...payrollLines]; n[i] = { ...line, matricule: e.target.value }; setPayrollLines(n); }} className="mt-1" /></div>
              <div><Label>Salaire brut</Label><Input type="number" value={line.grossSalary || ""} onChange={(e) => { const n = [...payrollLines]; n[i] = { ...line, grossSalary: Number(e.target.value) }; setPayrollLines(n); }} className="mt-1" /></div>
              <Button size="icon" variant="ghost" onClick={() => setPayrollLines(payrollLines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>TAP & IBS</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><Label>Activité TAP</Label>
            <Select value={tapActivity} onValueChange={(v) => setTapActivity(v as typeof tapActivity)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="production">Production (1.5%)</SelectItem><SelectItem value="services">Services (2%)</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Base TAP (CA HT)</Label><Input type="number" value={tapBase || ""} onChange={(e) => setTapBase(Number(e.target.value))} className="mt-1" /></div>
          <div><Label>Régime IBS</Label>
            <Select value={ibsRegime} onValueChange={(v) => setIbsRegime(v as typeof ibsRegime)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="standard">26%</SelectItem><SelectItem value="production">19%</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>IBS annuel précédent</Label><Input type="number" value={previousIbs || ""} onChange={(e) => setPreviousIbs(Number(e.target.value))} className="mt-1" placeholder="pour acompte 1/12" /></div>
        </CardContent>
      </Card>

      {result && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportG50Pdf({ company: company as Record<string, string>, result })}>
            <Download className="h-4 w-4 ml-1" /> PDF
          </Button>
          <Button variant="outline" onClick={() => exportG50Excel({ company: company as Record<string, string>, result })}>
            <FileSpreadsheet className="h-4 w-4 ml-1" /> Excel
          </Button>
        </div>
      )}

      {(listData?.declarations?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>التصاريح المحفوظة</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(listData?.declarations ?? []).map((d: { id: string; period_year: number; period_month: number; total_due: number; status: string; deadline_date: string }) => (
              <div key={d.id} className="flex items-center justify-between border rounded-lg p-3">
                <span>{d.period_year}/{d.period_month}</span>
                <Badge>{d.status}</Badge>
                <span className="font-semibold">{fmt(Number(d.total_due))}</span>
                <span className="text-xs text-muted-foreground">{d.deadline_date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
