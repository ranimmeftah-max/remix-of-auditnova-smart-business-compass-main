import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  getFinancialPlan,
  saveFinancialPlan,
  generateFinancialPlanDraft,
} from "@/lib/financial-plan.functions";
import {
  computeFinancialPlan,
  emptyFinancialPlan,
  formatDzd,
  pct,
  uid,
  type FinancialPlanInput,
} from "@/lib/financial-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

type YearTuple = [number, number, number, number, number];

function YearInputs({
  values,
  onChange,
}: {
  values: YearTuple;
  onChange: (v: YearTuple) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {values.map((v, i) => (
        <Input
          key={i}
          type="number"
          min={0}
          className="h-8 text-xs px-2"
          value={v || ""}
          onChange={(e) => {
            const next = [...values] as YearTuple;
            next[i] = Number(e.target.value) || 0;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function FinancialPlanBuilder({ backUrl, backLabelKey = "financialPlan.back" }: { backUrl: string; backLabelKey?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const getFn = useTypedServerFn(getFinancialPlan);
  const saveFn = useTypedServerFn(saveFinancialPlan);
  const draftFn = useTypedServerFn(generateFinancialPlanDraft);

  const { data, isLoading } = useQuery({ queryKey: ["financial-plan"], queryFn: () => getFn() });

  const [plan, setPlan] = useState<FinancialPlanInput>(emptyFinancialPlan());
  const [projectSummary, setProjectSummary] = useState("");

  useEffect(() => {
    if (data?.plan) setPlan(data.plan as FinancialPlanInput);
  }, [data?.plan]);

  const report = useMemo(() => computeFinancialPlan(plan), [plan]);

  const save = useMutation({
    mutationFn: () => saveFn(plan),
    onSuccess: () => {
      toast.success(t("financialPlan.saved"));
      qc.invalidateQueries({ queryKey: ["financial-plan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: () =>
      draftFn({
        projectTitle: plan.projectTitle,
        projectSummary,
      }),
    onSuccess: (res) => {
      setPlan(res.plan as FinancialPlanInput);
      toast.success(t("financialPlan.draftReady"));
      qc.invalidateQueries({ queryKey: ["financial-plan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-8 text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={backUrl}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t(backLabelKey)}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{t("financialPlan.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("financialPlan.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>{t("financialPlan.projectTitle")}</Label>
              <Input
                value={plan.projectTitle}
                onChange={(e) => setPlan((p) => ({ ...p, projectTitle: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("financialPlan.depreciationYears")}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={plan.depreciationYears}
                onChange={(e) => setPlan((p) => ({ ...p, depreciationYears: Number(e.target.value) || 5 }))}
              />
            </div>
          </div>
          <div>
            <Label>{t("financialPlan.projectSummary")}</Label>
            <Textarea value={projectSummary} onChange={(e) => setProjectSummary(e.target.value)} rows={3} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
              {t("financialPlan.save")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => generate.mutate()}
              disabled={generate.isPending || plan.projectTitle.trim().length < 2 || projectSummary.trim().length < 20}
            >
              {generate.isPending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Sparkles className="h-4 w-4 ml-2" />}
              {t("financialPlan.generateAi")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("financialPlan.be.unitCost")}</p><p className="text-lg font-bold">{formatDzd(report.breakEven.unitVariableCost)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("financialPlan.be.breakEven")}</p><p className="text-lg font-bold">{report.breakEven.breakEvenQuantity.toLocaleString("fr-DZ")}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("financialPlan.be.revenue")}</p><p className="text-lg font-bold">{formatDzd(report.breakEven.annualRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t("financialPlan.be.funding")}</p><p className="text-lg font-bold">{formatDzd(report.fundingNeedY1)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="breakEven">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="breakEven">{t("financialPlan.tabs.breakEven")}</TabsTrigger>
          <TabsTrigger value="revenue">{t("financialPlan.tabs.revenue")}</TabsTrigger>
          <TabsTrigger value="direct">{t("financialPlan.tabs.direct")}</TabsTrigger>
          <TabsTrigger value="payroll">{t("financialPlan.tabs.payroll")}</TabsTrigger>
          <TabsTrigger value="external">{t("financialPlan.tabs.external")}</TabsTrigger>
          <TabsTrigger value="investment">{t("financialPlan.tabs.investment")}</TabsTrigger>
          <TabsTrigger value="pl">{t("financialPlan.tabs.pl")}</TabsTrigger>
        </TabsList>

        <TabsContent value="breakEven" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.be.variable")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {plan.variableCosts.map((row, idx) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <Input className="flex-1" placeholder={t("financialPlan.label")} value={row.label} onChange={(e) => {
                    const next = [...plan.variableCosts]; next[idx] = { ...row, label: e.target.value }; setPlan((p) => ({ ...p, variableCosts: next }));
                  }} />
                  <Input type="number" className="w-32" value={row.unitCost || ""} onChange={(e) => {
                    const next = [...plan.variableCosts]; next[idx] = { ...row, unitCost: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, variableCosts: next }));
                  }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, variableCosts: p.variableCosts.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, variableCosts: [...p.variableCosts, { id: uid(), label: "", unitCost: 0 }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.be.fixed")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {plan.fixedCosts.map((row, idx) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <Input className="flex-1" value={row.label} onChange={(e) => {
                    const next = [...plan.fixedCosts]; next[idx] = { ...row, label: e.target.value }; setPlan((p) => ({ ...p, fixedCosts: next }));
                  }} />
                  <Input type="number" className="w-36" value={row.annualAmount || ""} onChange={(e) => {
                    const next = [...plan.fixedCosts]; next[idx] = { ...row, annualAmount: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, fixedCosts: next }));
                  }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, fixedCosts: p.fixedCosts.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, fixedCosts: [...p.fixedCosts, { id: uid(), label: "", annualAmount: 0 }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t">
                <div><Label>{t("financialPlan.be.sellingPrice")}</Label><Input type="number" value={plan.sellingPrice || ""} onChange={(e) => setPlan((p) => ({ ...p, sellingPrice: Number(e.target.value) || 0 }))} /></div>
                <div><Label>{t("financialPlan.be.expectedQty")}</Label><Input type="number" value={plan.expectedAnnualQty || ""} onChange={(e) => setPlan((p) => ({ ...p, expectedAnnualQty: Number(e.target.value) || 0 }))} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.revenue")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              <div className="grid grid-cols-[1fr_5rem_repeat(5,minmax(4rem,1fr))_5rem_auto] gap-2 text-xs font-medium text-muted-foreground min-w-[640px]">
                <span>{t("financialPlan.designation")}</span><span>{t("financialPlan.unitPrice")}</span>
                {[1, 2, 3, 4, 5].map((y) => <span key={y}>Y{y}</span>)}<span>{t("financialPlan.total")}</span><span />
              </div>
              {plan.products.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_5rem_repeat(5,minmax(4rem,1fr))_5rem_auto] gap-2 items-center min-w-[640px]">
                  <Input value={row.designation} onChange={(e) => { const next = [...plan.products]; next[idx] = { ...row, designation: e.target.value }; setPlan((p) => ({ ...p, products: next })); }} />
                  <Input type="number" value={row.unitPrice || ""} onChange={(e) => { const next = [...plan.products]; next[idx] = { ...row, unitPrice: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, products: next })); }} />
                  <div className="col-span-5"><YearInputs values={row.quantities} onChange={(quantities) => { const next = [...plan.products]; next[idx] = { ...row, quantities }; setPlan((p) => ({ ...p, products: next })); }} /></div>
                  <span className="text-xs font-medium">{formatDzd(row.quantities[0] * row.unitPrice)}</span>
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, products: p.products.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, products: [...p.products, { id: uid(), designation: "", quantities: [0, 0, 0, 0, 0], unitPrice: 0 }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.direct")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              {plan.directCosts.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_5rem_1fr_auto] gap-2 items-center min-w-[520px]">
                  <Input value={row.designation} onChange={(e) => { const next = [...plan.directCosts]; next[idx] = { ...row, designation: e.target.value }; setPlan((p) => ({ ...p, directCosts: next })); }} />
                  <Input type="number" value={row.unitCost || ""} onChange={(e) => { const next = [...plan.directCosts]; next[idx] = { ...row, unitCost: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, directCosts: next })); }} />
                  <YearInputs values={row.quantities} onChange={(quantities) => { const next = [...plan.directCosts]; next[idx] = { ...row, quantities }; setPlan((p) => ({ ...p, directCosts: next })); }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, directCosts: p.directCosts.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, directCosts: [...p.directCosts, { id: uid(), designation: "", quantities: [0, 0, 0, 0, 0], unitCost: 0 }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.payroll")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              {plan.payroll.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_6rem_1fr_auto] gap-2 items-center min-w-[560px]">
                  <Input value={row.role} onChange={(e) => { const next = [...plan.payroll]; next[idx] = { ...row, role: e.target.value }; setPlan((p) => ({ ...p, payroll: next })); }} />
                  <Input type="number" value={row.baseSalaryMonthly || ""} onChange={(e) => { const next = [...plan.payroll]; next[idx] = { ...row, baseSalaryMonthly: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, payroll: next })); }} />
                  <YearInputs values={row.etp} onChange={(etp) => { const next = [...plan.payroll]; next[idx] = { ...row, etp }; setPlan((p) => ({ ...p, payroll: next })); }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, payroll: p.payroll.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, payroll: [...p.payroll, { id: uid(), role: "", baseSalaryMonthly: 0, etp: [0, 0, 0, 0, 0] }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.external")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {plan.externalCharges.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input value={row.label} onChange={(e) => { const next = [...plan.externalCharges]; next[idx] = { ...row, label: e.target.value }; setPlan((p) => ({ ...p, externalCharges: next })); }} />
                  <YearInputs values={row.amounts} onChange={(amounts) => { const next = [...plan.externalCharges]; next[idx] = { ...row, amounts }; setPlan((p) => ({ ...p, externalCharges: next })); }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, externalCharges: p.externalCharges.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, externalCharges: [...p.externalCharges, { id: uid(), label: "", amounts: [0, 0, 0, 0, 0] }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investment" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.investment")}</CardTitle></CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              {plan.investments.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_5rem_1fr_auto] gap-2 items-center min-w-[680px]">
                  <Input placeholder={t("financialPlan.designation")} value={row.designation} onChange={(e) => { const next = [...plan.investments]; next[idx] = { ...row, designation: e.target.value }; setPlan((p) => ({ ...p, investments: next })); }} />
                  <Input placeholder={t("financialPlan.functionality")} value={row.functionality} onChange={(e) => { const next = [...plan.investments]; next[idx] = { ...row, functionality: e.target.value }; setPlan((p) => ({ ...p, investments: next })); }} />
                  <Input type="number" value={row.unitPrice || ""} onChange={(e) => { const next = [...plan.investments]; next[idx] = { ...row, unitPrice: Number(e.target.value) || 0 }; setPlan((p) => ({ ...p, investments: next })); }} />
                  <YearInputs values={row.amounts} onChange={(amounts) => { const next = [...plan.investments]; next[idx] = { ...row, amounts }; setPlan((p) => ({ ...p, investments: next })); }} />
                  <Button size="icon" variant="ghost" onClick={() => setPlan((p) => ({ ...p, investments: p.investments.filter((r) => r.id !== row.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPlan((p) => ({ ...p, investments: [...p.investments, { id: uid(), designation: "", functionality: "", unitPrice: 0, amounts: [0, 0, 0, 0, 0] }] }))}><Plus className="h-4 w-4 ml-1" />{t("financialPlan.addRow")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pl" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("financialPlan.tabs.pl")}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-2">{t("financialPlan.pl.line")}</th>
                    {[1, 2, 3, 4, 5].map((y) => <th key={y} className="text-left py-2">Y{y}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["revenue", (y: typeof report.years[0]) => y.revenue],
                    ["direct", (y: typeof report.years[0]) => -y.directPurchases],
                    ["gross", (y: typeof report.years[0]) => y.grossMargin],
                    ["external", (y: typeof report.years[0]) => -y.externalCharges],
                    ["payroll", (y: typeof report.years[0]) => -y.payroll],
                    ["ebitda", (y: typeof report.years[0]) => y.ebitda],
                    ["depreciation", (y: typeof report.years[0]) => -y.depreciation],
                    ["net", (y: typeof report.years[0]) => y.netResult],
                  ].map(([key, fn]) => (
                    <tr key={key as string} className="border-b">
                      <td className="py-2 font-medium">{t(`financialPlan.pl.${key}`)}</td>
                      {report.years.map((y, i) => (
                        <td key={i} className="py-2 tabular-nums">{formatDzd((fn as (y: typeof report.years[0]) => number)(y))}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 text-muted-foreground">{t("financialPlan.pl.grossRate")}</td>
                    {report.years.map((y, i) => <td key={i} className="py-2">{pct(y.grossMarginRate)}</td>)}
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">{t("financialPlan.pl.ebitdaRate")}</td>
                    {report.years.map((y, i) => <td key={i} className="py-2">{pct(y.ebitdaRate)}</td>)}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">{t("financialPlan.synthesis")}</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground">{t("financialPlan.synthesis.investment")}</p><p className="font-bold">{formatDzd(report.totalInvestment)}</p></div>
              <div><p className="text-muted-foreground">{t("financialPlan.synthesis.payroll")}</p><p className="font-bold">{formatDzd(report.totalPayrollY1)}</p></div>
              <div><p className="text-muted-foreground">{t("financialPlan.synthesis.external")}</p><p className="font-bold">{formatDzd(report.totalExternalY1)}</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
