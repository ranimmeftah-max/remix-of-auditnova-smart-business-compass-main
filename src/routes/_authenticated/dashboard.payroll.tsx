import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Plus, Save, Sparkles, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getCompany } from "@/lib/enterprise.functions";
import {
  deletePayrollSlip, getMockPayrollData, listPayrollSlips, upsertPayrollSlip,
} from "@/lib/tax.functions";
import { calcPayrollLine } from "@/lib/tax/calculations";
import { exportPayrollPdf } from "@/lib/tax/export-payroll-pdf";

export const Route = createFileRoute("/_authenticated/dashboard/payroll")({
  head: () => ({ meta: [{ title: "فiches de paie — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: PayrollPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);

function PayrollPage() {
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listPayrollSlips);
  const saveFn = useTypedServerFn(upsertPayrollSlip);
  const delFn = useTypedServerFn(deletePayrollSlip);
  const mockFn = useTypedServerFn(getMockPayrollData);
  const getCo = useTypedServerFn(getCompany);

  const { data, isLoading } = useQuery({ queryKey: ["payroll-slips"], queryFn: () => listFn() });
  const { data: coData } = useQuery({ queryKey: ["company"], queryFn: () => getCo() });

  const now = new Date();
  const [form, setForm] = useState({
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
    employee_name: "",
    matricule: "",
    job_title: "",
    gross_salary: 0,
    days_worked: 26,
  });

  const preview = form.gross_salary > 0
    ? calcPayrollLine({ employeeName: form.employee_name || "—", grossSalary: form.gross_salary, matricule: form.matricule })
    : null;

  const saveMut = useMutation({
    mutationFn: () => saveFn({
      ...form,
      employer_name: coData?.company?.legal_name ?? null,
      employer_nif: coData?.company?.nif ?? null,
      employer_address: coData?.company?.address ?? null,
    } as never),
    onSuccess: () => { toast.success("تم حفظ fiche de paie"); qc.invalidateQueries({ queryKey: ["payroll-slips"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mockMut = useMutation({
    mutationFn: () => mockFn(),
    onSuccess: (d) => {
      setForm({ ...form, ...d.mock, gross_salary: d.mock.gross_salary });
      toast.success("بيانات تجريبية");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ id }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["payroll-slips"] }); },
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> فiches de paie
        </h1>
        <Button variant="outline" onClick={() => mockMut.mutate()}><Sparkles className="h-4 w-4 ml-1" /> تجريبي</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>إنشاء fiche de paie</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label>الموظف</Label><Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} className="mt-1" /></div>
          <div><Label>Matricule</Label><Input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} className="mt-1" /></div>
          <div><Label>Poste</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="mt-1" /></div>
          <div><Label>Salaire brut</Label><Input type="number" value={form.gross_salary || ""} onChange={(e) => setForm({ ...form, gross_salary: Number(e.target.value) })} className="mt-1" /></div>
          <div><Label>الشهر</Label><Input type="number" min={1} max={12} value={form.period_month} onChange={(e) => setForm({ ...form, period_month: Number(e.target.value) })} className="mt-1" /></div>
          <div><Label>السنة</Label><Input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })} className="mt-1" /></div>
          {preview && (
            <div className="md:col-span-2 grid sm:grid-cols-4 gap-2 p-3 bg-muted rounded-lg text-sm">
              <div>CNAS sal.: {fmt(preview.cnasEmployee)}</div>
              <div>CNAS emp.: {fmt(preview.cnasEmployer)}</div>
              <div>IRG: {fmt(preview.irg)}</div>
              <div className="font-bold">Net: {fmt(preview.netSalary)}</div>
            </div>
          )}
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
            {preview && (
              <Button variant="outline" onClick={() => exportPayrollPdf({
                slip: {
                  ...preview,
                  period_year: form.period_year,
                  period_month: form.period_month,
                  job_title: form.job_title,
                  employer_name: coData?.company?.legal_name ?? undefined,
                  employer_nif: coData?.company?.nif ?? undefined,
                  employer_address: coData?.company?.address ?? undefined,
                },
              })}><Download className="h-4 w-4 ml-1" /> PDF</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>السجل</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : (
            <div className="space-y-2">
              {(data?.slips ?? []).map((s: {
                id: string; employee_name: string; period_year: number; period_month: number;
                gross_salary: number; net_salary: number; irg: number;
              }) => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{s.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{s.period_month}/{s.period_year}</p>
                  </div>
                  <div className="text-sm">Brut: {fmt(Number(s.gross_salary))} → Net: {fmt(Number(s.net_salary))}</div>
                  <Button size="icon" variant="ghost" onClick={() => delMut.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {(data?.slips ?? []).length === 0 && <p className="text-muted-foreground">لا توجد fiches.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
