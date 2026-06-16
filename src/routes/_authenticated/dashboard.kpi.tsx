import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listPeriods } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/kpi")({
  head: () => ({ meta: [{ title: "مؤشرات الأداء — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: KpiPage,
});

const fmt = (n: number) => Number(n).toLocaleString("fr-DZ", { maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function KpiPage() {
  const list = useTypedServerFn(listPeriods);
  const { data } = useQuery({ queryKey: ["periods"], queryFn: () => list() });
  const periods = [...(data?.periods ?? [])].sort((a: any, b: any) => a.period_end.localeCompare(b.period_end));
  const latest: any = periods[periods.length - 1];
  const prev: any = periods[periods.length - 2];

  const kpis = latest ? [
    { label: "الإيرادات", value: fmt(latest.revenue_dzd) + " دج", delta: prev ? (latest.revenue_dzd - prev.revenue_dzd) / Math.max(prev.revenue_dzd, 1) : null },
    { label: "EBITDA", value: fmt(latest.ebitda_dzd) + " دج", delta: prev ? (latest.ebitda_dzd - prev.ebitda_dzd) / Math.max(Math.abs(prev.ebitda_dzd), 1) : null },
    { label: "هامش EBITDA", value: pct(latest.ebitda_dzd / Math.max(latest.revenue_dzd, 1)), delta: null },
    { label: "صافي الربح", value: fmt(latest.net_income_dzd) + " دج", delta: prev ? (latest.net_income_dzd - prev.net_income_dzd) / Math.max(Math.abs(prev.net_income_dzd), 1) : null },
    { label: "هامش صافي", value: pct(latest.net_income_dzd / Math.max(latest.revenue_dzd, 1)), delta: null },
    { label: "النقدية", value: fmt(latest.cash_dzd) + " دج", delta: null },
    { label: "نسبة الديون", value: pct(latest.liabilities_dzd / Math.max(latest.assets_dzd, 1)), delta: null },
    { label: "عدد العملاء", value: fmt(latest.customers_count), delta: prev ? (latest.customers_count - prev.customers_count) / Math.max(prev.customers_count, 1) : null },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Gauge className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">مؤشرات الأداء</h2></div>
      {!latest ? <Card><CardContent className="py-12 text-center text-muted-foreground">أضف فترة مالية من صفحة "التقارير" لعرض المؤشرات</CardContent></Card>
      : <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => (
            <Card key={k.label}><CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
              {k.delta != null && <p className={`text-xs mt-1 flex items-center gap-1 ${k.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {k.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{pct(Math.abs(k.delta))}
              </p>}
            </CardContent></Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>تطور الإيرادات</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {periods.slice(-12).map((p: any) => {
                const max = Math.max(...periods.map((x: any) => Number(x.revenue_dzd) || 0), 1);
                const h = (Number(p.revenue_dzd) || 0) / max * 100;
                return <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/80 rounded-t" style={{ height: `${h}%` }} title={fmt(p.revenue_dzd)} />
                  <span className="text-[10px] text-muted-foreground">{p.period_label}</span>
                </div>;
              })}
            </div>
          </CardContent>
        </Card>
      </>}
    </div>
  );
}
