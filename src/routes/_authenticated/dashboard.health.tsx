import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listPeriods, getCompany } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/health")({
  head: () => ({ meta: [{ title: "تقييم النضج — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: HealthPage,
});

function scoreOf(latest: any, hasCompany: boolean): { items: { label: string; score: number; note: string }[]; total: number } {
  if (!latest) return { items: [], total: 0 };
  const rev = Number(latest.revenue_dzd) || 0;
  const ebitda = Number(latest.ebitda_dzd) || 0;
  const cash = Number(latest.cash_dzd) || 0;
  const assets = Number(latest.assets_dzd) || 0;
  const liab = Number(latest.liabilities_dzd) || 0;
  const opex = Number(latest.opex_dzd) || 1;
  const margin = rev > 0 ? ebitda / rev : 0;
  const leverage = assets > 0 ? liab / assets : 1;
  const runway = opex > 0 ? (cash / (opex / 12)) : 0;
  const items = [
    { label: "هامش EBITDA", score: Math.max(0, Math.min(100, Math.round(margin * 400))), note: `${(margin * 100).toFixed(1)}%` },
    { label: "السيولة (Runway)", score: Math.max(0, Math.min(100, Math.round((runway / 18) * 100))), note: `${runway.toFixed(1)} شهر` },
    { label: "الرفع المالي", score: Math.max(0, Math.min(100, Math.round((1 - leverage) * 100))), note: `${(leverage * 100).toFixed(0)}%` },
    { label: "النمو في العملاء", score: latest.customers_count > 0 ? 80 : 30, note: `${latest.customers_count} عميل` },
    { label: "اكتمال بطاقة المؤسسة", score: hasCompany ? 100 : 20, note: hasCompany ? "مكتملة" : "ناقصة" },
  ];
  const total = Math.round(items.reduce((s, i) => s + i.score, 0) / items.length);
  return { items, total };
}

function HealthPage() {
  const lp = useTypedServerFn(listPeriods);
  const gc = useTypedServerFn(getCompany);
  const { data: periods } = useQuery({ queryKey: ["periods"], queryFn: () => lp() });
  const { data: comp } = useQuery({ queryKey: ["company"], queryFn: () => gc() });
  const sorted = [...(periods?.periods ?? [])].sort((a: any, b: any) => a.period_end.localeCompare(b.period_end));
  const latest = sorted[sorted.length - 1];
  const { items, total } = scoreOf(latest, !!comp?.company);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Activity className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">تقييم نضج المؤسسة</h2></div>
      <Card>
        <CardHeader><CardTitle>الدرجة الكلية</CardTitle></CardHeader>
        <CardContent>
          <div className="text-5xl font-bold text-primary">{total}<span className="text-2xl text-muted-foreground">/100</span></div>
          <Progress value={total} className="mt-3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>تفاصيل المعايير</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!items.length ? <p className="text-muted-foreground text-center py-6">أضف فترة مالية لعرض التقييم</p>
          : items.map(it => (
            <div key={it.label}>
              <div className="flex justify-between text-sm mb-1"><span>{it.label}</span><span className="text-muted-foreground">{it.note} — {it.score}</span></div>
              <Progress value={it.score} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
