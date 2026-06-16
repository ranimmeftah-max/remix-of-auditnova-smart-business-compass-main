import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ensureSmeAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  smeServiceIds,
  CONTROL_QUESTION_IDS,
  listSmeAudits,
  runAiAudit,
  getSmeRiskDashboard,
  getSmeKpiDashboard,
  getLatestControlAssessment,
  runInternalControlAssessment,
  listSmeObligations,
  seedSmeObligations,
  updateSmeObligation,
  askSmeAssistant,
} from "@/lib/sme.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

type ServiceId = (typeof smeServiceIds)[number];

export const Route = createFileRoute("/_authenticated/dashboard/sme/$service")({
  beforeLoad: ensureSmeAccount,
  component: SmeServicePage,
});

function SmeServicePage() {
  const { service } = Route.useParams();
  const { t } = useTranslation();
  if (!smeServiceIds.includes(service as ServiceId)) {
    return <div className="p-8 text-destructive">خدمة غير موجودة</div>;
  }
  const id = service as ServiceId;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/dashboard/sme">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("sme.hub.back")}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">{t(`sme.services.${id}.title`)}</h1>
        <p className="text-muted-foreground mt-1">{t(`sme.services.${id}.longDesc`)}</p>
        <Badge className="mt-2" variant="outline">{t(`sme.pricing.${id}`)}</Badge>
      </div>
      {id === "ai-audit" && <AiAuditPanel />}
      {id === "risk" && <RiskPanel />}
      {id === "kpi" && <KpiPanel />}
      {id === "internal-control" && <InternalControlPanel />}
      {id === "legal-compliance" && <LegalCompliancePanel />}
      {id === "ai-assistant" && <AssistantPanel />}
    </div>
  );
}

function AiAuditPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listSmeAudits);
  const runFn = useTypedServerFn(runAiAudit);
  const { data, isLoading } = useQuery({ queryKey: ["sme-audits"], queryFn: () => listFn() });
  const [content, setContent] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [result, setResult] = useState<{ risks: string[]; recommendations: string[] } | null>(null);

  const run = useMutation({
    mutationFn: () => runFn({ documentContent: content, periodLabel: periodLabel || undefined }),
    onSuccess: (res) => {
      toast.success(t("sme.audit.done"));
      setResult({ risks: res.risks, recommendations: res.recommendations });
      qc.invalidateQueries({ queryKey: ["sme-audits"] });
      qc.invalidateQueries({ queryKey: ["sme-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("sme.audit.formTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t("sme.audit.period")}</Label>
            <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="Q1 2026" />
          </div>
          <div>
            <Label>{t("sme.audit.content")}</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder={t("sme.audit.contentPlaceholder")}
            />
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending || content.length < 20}>
            {run.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("sme.audit.run")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("sme.audit.result")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">{t("sme.audit.risks")}</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {result.risks.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">{t("sme.audit.recommendations")}</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {result.recommendations.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      <div className="space-y-2">
        {(data?.audits ?? []).map((a: { id: string; title: string; score: number | null; summary: string | null }) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium">{a.title}</p>
                  {a.summary && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>}
                </div>
                {a.score != null && <Badge>{a.score}/100</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RiskPanel() {
  const { t } = useTranslation();
  const riskFn = useTypedServerFn(getSmeRiskDashboard);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["sme-risk"], queryFn: () => riskFn() });

  const categories = [
    { key: "liquidity", label: t("sme.risk.liquidity") },
    { key: "collection", label: t("sme.risk.collection") },
    { key: "suppliers", label: t("sme.risk.suppliers") },
  ] as const;

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => refetch()}>{t("sme.risk.refresh")}</Button>
      {isLoading && <p>{t("common.loading")}</p>}

      <div className="grid sm:grid-cols-3 gap-4">
        {categories.map((c) => {
          const items = (data?.grouped as Record<string, unknown[]> | undefined)?.[c.key] ?? [];
          return (
            <Card key={c.key}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{c.label}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-xs text-muted-foreground">{t("sme.risk.registered")}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h3 className="font-medium">{t("sme.risk.alerts")}</h3>
      {(data?.alerts ?? []).length === 0 && !isLoading && (
        <p className="text-muted-foreground">{t("sme.risk.empty")}</p>
      )}
      {(data?.alerts ?? []).map((a: { title: string; body: string; level: string; category: string }, i: number) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-2 mb-2">
              <Badge variant={a.level === "critical" ? "destructive" : "secondary"}>{a.level}</Badge>
              <Badge variant="outline">{a.category}</Badge>
            </div>
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.body}</p>
          </CardContent>
        </Card>
      ))}

      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard/risk">{t("sme.risk.manage")}</Link>
      </Button>
    </div>
  );
}

function KpiPanel() {
  const { t } = useTranslation();
  const kpiFn = useTypedServerFn(getSmeKpiDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["sme-kpi"], queryFn: () => kpiFn() });
  const m = data?.metrics;

  const fmt = (n: number | null | undefined) =>
    n != null ? Number(n).toLocaleString("fr-DZ", { maximumFractionDigits: 0 }) : "—";

  const sections = m?.hasData
    ? [
        {
          title: t("sme.kpi.profitability"),
          items: [
            { label: t("sme.kpi.grossMargin"), value: m.profitability?.grossMargin != null ? `${m.profitability.grossMargin}%` : "—" },
            { label: t("sme.kpi.ebitdaMargin"), value: m.profitability?.ebitdaMargin != null ? `${m.profitability.ebitdaMargin}%` : "—" },
            { label: t("sme.kpi.netMargin"), value: m.profitability?.netMargin != null ? `${m.profitability.netMargin}%` : "—" },
            { label: t("sme.kpi.netIncome"), value: `${fmt(m.profitability?.netIncome)} دج` },
          ],
        },
        {
          title: t("sme.kpi.liquidity"),
          items: [
            { label: t("sme.kpi.cash"), value: `${fmt(m.liquidity?.cash)} دج` },
            { label: t("sme.kpi.runway"), value: m.liquidity?.runwayMonths != null ? `${m.liquidity.runwayMonths} شهر` : "—" },
            { label: t("sme.kpi.cashRatio"), value: m.liquidity?.cashRatio != null ? `${m.liquidity.cashRatio}%` : "—" },
          ],
        },
        {
          title: t("sme.kpi.debt"),
          items: [
            { label: t("sme.kpi.debtRatio"), value: m.debt?.debtRatio != null ? `${m.debt.debtRatio}%` : "—" },
            { label: t("sme.kpi.equityRatio"), value: m.debt?.equityRatio != null ? `${m.debt.equityRatio}%` : "—" },
            { label: t("sme.kpi.liabilities"), value: `${fmt(m.debt?.liabilities)} دج` },
          ],
        },
        {
          title: t("sme.kpi.productivity"),
          items: [
            { label: t("sme.kpi.revPerEmployee"), value: m.productivity?.revenuePerEmployee != null ? `${fmt(m.productivity.revenuePerEmployee)} دج` : "—" },
            { label: t("sme.kpi.revPerCustomer"), value: m.productivity?.revenuePerCustomer != null ? `${fmt(m.productivity.revenuePerCustomer)} دج` : "—" },
            { label: t("sme.kpi.customers"), value: fmt(m.productivity?.customers) },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {isLoading && <p>{t("common.loading")}</p>}
      {!m?.hasData && !isLoading && (
        <p className="text-muted-foreground">{t("sme.kpi.noData")}</p>
      )}
      {sections.map((sec) => (
        <div key={sec.title}>
          <h3 className="font-medium mb-2">{sec.title}</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {sec.items.map((it) => (
              <Card key={it.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{it.label}</p>
                  <p className="text-xl font-bold mt-1">{it.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {(m?.chart ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("sme.kpi.revenueChart")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-48">
              {m!.chart.map((p: { label: string; revenue: number }) => {
                const max = Math.max(...m!.chart.map((x: { revenue: number }) => x.revenue), 1);
                const h = (p.revenue / max) * 100;
                return (
                  <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary/80 rounded-t" style={{ height: `${h}%` }} title={fmt(p.revenue)} />
                    <span className="text-[10px] text-muted-foreground">{p.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard/reports">{t("sme.kpi.addData")}</Link>
      </Button>
    </div>
  );
}

function InternalControlPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const latestFn = useTypedServerFn(getLatestControlAssessment);
  const runFn = useTypedServerFn(runInternalControlAssessment);
  const { data } = useQuery({ queryKey: ["sme-control"], queryFn: () => latestFn() });

  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const init: Record<string, number> = {};
    for (const id of CONTROL_QUESTION_IDS) init[id] = 3;
    setScores(init);
  }, []);

  const run = useMutation({
    mutationFn: () => runFn({ scores, notes: notes || undefined }),
    onSuccess: () => {
      toast.success(t("sme.control.done"));
      qc.invalidateQueries({ queryKey: ["sme-control"] });
      qc.invalidateQueries({ queryKey: ["sme-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assessment = data?.assessment as {
    report?: { diagnosis?: string; strengths?: string[]; weaknesses?: string[]; actionPlan?: string[] };
    total_score?: number;
  } | null;
  const report = assessment?.report;
  const totalScore = assessment?.total_score;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("sme.control.formTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {CONTROL_QUESTION_IDS.map((id) => (
            <div key={id} className="space-y-2">
              <Label>{t(`sme.control.questions.${id}`)}</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={scores[id] === n ? "default" : "outline"}
                    onClick={() => setScores((s) => ({ ...s, [id]: n }))}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label>{t("sme.control.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("sme.control.run")}
          </Button>
        </CardContent>
      </Card>

      {totalScore != null && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("sme.control.result")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("sme.control.score")}</p>
              <p className="text-3xl font-bold">{totalScore}/100</p>
              <Progress value={totalScore} className="mt-2" />
            </div>
            {report?.diagnosis && <p className="text-sm">{report.diagnosis}</p>}
            {report?.strengths && (
              <div>
                <p className="font-medium text-sm">{t("sme.control.strengths")}</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {report.strengths.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {report?.weaknesses && (
              <div>
                <p className="font-medium text-sm">{t("sme.control.weaknesses")}</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {report.weaknesses.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {report?.actionPlan && (
              <div>
                <p className="font-medium text-sm">{t("sme.control.actionPlan")}</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {report.actionPlan.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LegalCompliancePanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listSmeObligations);
  const seedFn = useTypedServerFn(seedSmeObligations);
  const updateFn = useTypedServerFn(updateSmeObligation);
  const { data, isLoading } = useQuery({ queryKey: ["sme-obligations"], queryFn: () => listFn() });

  const seed = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: () => {
      toast.success(t("sme.compliance.seeded"));
      qc.invalidateQueries({ queryKey: ["sme-obligations"] });
      qc.invalidateQueries({ queryKey: ["sme-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markDone = useMutation({
    mutationFn: (id: string) => updateFn({ id, status: "done" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sme-obligations"] }),
  });

  const obligations = data?.obligations ?? [];

  return (
    <div className="space-y-4">
      {obligations.length === 0 && (
        <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
          {t("sme.compliance.initCalendar")}
        </Button>
      )}
      {isLoading && <p>{t("common.loading")}</p>}
      <div className="space-y-2">
        {obligations.map((o: { id: string; title: string; category: string; next_due_date: string | null; status: string; frequency: string }) => (
          <Card key={o.id}>
            <CardContent className="p-4 flex justify-between gap-3 items-start">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <Badge variant="outline">{o.category}</Badge>
                  <Badge variant={o.status === "overdue" ? "destructive" : "secondary"}>{o.status}</Badge>
                  {o.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
                <p className="font-medium">{o.title}</p>
                <p className="text-sm text-muted-foreground">
                  {o.next_due_date ? `${t("sme.compliance.due")}: ${o.next_due_date}` : ""} · {o.frequency}
                </p>
              </div>
              {o.status !== "done" && (
                <Button size="sm" variant="outline" onClick={() => markDone.mutate(o.id)}>
                  {t("sme.compliance.done")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AssistantPanel() {
  const { t } = useTranslation();
  const askFn = useTypedServerFn(askSmeAssistant);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  const ask = useMutation({
    mutationFn: (q: string) => askFn({ question: q }),
    onSuccess: (res, q) => {
      setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: res.answer }]);
      setQuestion("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-sm">{t("sme.assistant.hint")}</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`text-sm p-3 rounded-lg ${msg.role === "user" ? "bg-muted ml-8" : "bg-primary/5 mr-8"}`}>
              {msg.text}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("sme.assistant.placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim().length >= 3) ask.mutate(question.trim());
          }}
        />
        <Button onClick={() => ask.mutate(question.trim())} disabled={ask.isPending || question.trim().length < 3}>
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sme.assistant.send")}
        </Button>
      </div>
    </div>
  );
}
