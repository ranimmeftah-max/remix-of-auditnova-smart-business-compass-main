import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ensureStartupAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  runReadinessAssessment,
  runInvestorReadiness,
  runLabel1275Assessment,
  getGrowthDashboard,
  getRiskPredictions,
  listComplianceAlerts,
  refreshComplianceAlerts,
  updateComplianceAlert,
  getLatestAssessment,
  getStartupWork,
  generateStartupWork,
  startupWorkModuleIds,
} from "@/lib/startup.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { BusinessModelCanvas } from "@/components/BusinessModelCanvas";
import { FinancialPlanBuilder } from "@/components/FinancialPlanBuilder";
import type { BmcBlocks } from "@/lib/bmc";

const VALID = ["readiness", "investor", "compliance", "risk-ai", "growth", "bmc", "financial", "label1275"] as const;
type ServiceId = (typeof VALID)[number];
type StartupWorkId = (typeof startupWorkModuleIds)[number];

export const Route = createFileRoute("/_authenticated/dashboard/startup/$service")({
  beforeLoad: ensureStartupAccount,
  component: StartupServicePage,
});

function StartupServicePage() {
  const { service } = Route.useParams();
  const { t } = useTranslation();
  if (!VALID.includes(service as ServiceId)) {
    return <div className="p-8 text-destructive">خدمة غير موجودة</div>;
  }
  const id = service as ServiceId;

  return (
    <div className={`p-4 md:p-6 mx-auto space-y-6 ${id === "bmc" ? "max-w-6xl" : "max-w-4xl"}`} dir="rtl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/dashboard/startup">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("startup.hub.back")}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">{t(`startup.services.${id}.title`)}</h1>
        <p className="text-muted-foreground mt-1">{t(`startup.services.${id}.longDesc`)}</p>
        <Badge className="mt-2" variant="outline">{t(`startup.pricing.${id}`)}</Badge>
      </div>
      {id === "readiness" && <ReadinessPanel />}
      {id === "investor" && <InvestorPanel />}
      {id === "compliance" && <CompliancePanel />}
      {id === "risk-ai" && <RiskPanel />}
      {id === "growth" && <GrowthPanel />}
      {id === "bmc" && <StartupWorkPanel module="bmc" />}
      {id === "financial" && <FinancialPlanBuilder backUrl="/dashboard/startup" backLabelKey="startup.hub.back" />}
      {id === "label1275" && <Label1275Panel />}
    </div>
  );
}

function ReadinessPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const runFn = useTypedServerFn(runReadinessAssessment);
  const latestFn = useTypedServerFn(getLatestAssessment);
  const { data: latest } = useQuery({
    queryKey: ["startup-assessment", "readiness"],
    queryFn: () => latestFn({ kind: "readiness" }),
  });
  const [scores, setScores] = useState({ management: 3, finance: 3, governance: 3, legal: 3, risk: 3 });
  const [notes, setNotes] = useState("");

  const run = useMutation({
    mutationFn: () => runFn({ ...scores, notes: notes || undefined }),
    onSuccess: () => {
      toast.success(t("startup.runDone"));
      qc.invalidateQueries({ queryKey: ["startup-assessment", "readiness"] });
      qc.invalidateQueries({ queryKey: ["startup-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = latest?.assessment?.report as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("startup.readiness.formTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(["management", "finance", "governance", "legal", "risk"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label>{t(`startup.readiness.${k}`)} (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={scores[k]}
                onChange={(e) => setScores((s) => ({ ...s, [k]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label>{t("startup.readiness.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {t("startup.readiness.run")}
          </Button>
        </CardContent>
      </Card>
      {latest?.assessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("startup.result")}: {latest.assessment.score}/100
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {typeof report?.diagnosis === "string" && <p>{report.diagnosis}</p>}
            {Array.isArray(report?.actionPlan) && (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {(report.actionPlan as string[]).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvestorPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const runFn = useTypedServerFn(runInvestorReadiness);
  const latestFn = useTypedServerFn(getLatestAssessment);
  const { data: latest } = useQuery({
    queryKey: ["startup-assessment", "investor"],
    queryFn: () => latestFn({ kind: "investor" }),
  });
  const [pitchSummary, setPitch] = useState("");
  const [businessModel, setBm] = useState("");
  const [revenueModel, setRm] = useState("");
  const [projections, setProj] = useState("");

  const run = useMutation({
    mutationFn: () => runFn({ pitchSummary, businessModel, revenueModel, projections }),
    onSuccess: () => {
      toast.success(t("startup.runDone"));
      qc.invalidateQueries({ queryKey: ["startup-assessment", "investor"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = latest?.assessment?.report as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div><Label>Pitch Deck / الملخص</Label><Textarea value={pitchSummary} onChange={(e) => setPitch(e.target.value)} rows={4} /></div>
          <div><Label>نموذج العمل</Label><Textarea value={businessModel} onChange={(e) => setBm(e.target.value)} rows={3} /></div>
          <div><Label>نموذج الإيرادات</Label><Textarea value={revenueModel} onChange={(e) => setRm(e.target.value)} rows={3} /></div>
          <div><Label>التوقعات المالية</Label><Textarea value={projections} onChange={(e) => setProj(e.target.value)} rows={3} /></div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>{t("startup.investor.run")}</Button>
        </CardContent>
      </Card>
      {latest?.assessment && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("startup.result")}: {latest.assessment.score}/100</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {typeof report?.summary === "string" && <p>{report.summary}</p>}
            {Array.isArray(report?.feedback) &&
              (report.feedback as Array<{ area: string; comment: string; rating: string }>).map((f) => (
                <div key={f.area} className="border-t pt-2">
                  <p className="font-medium">{f.area} — {f.rating}</p>
                  <p className="text-muted-foreground">{f.comment}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompliancePanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listComplianceAlerts);
  const refreshFn = useTypedServerFn(refreshComplianceAlerts);
  const updateFn = useTypedServerFn(updateComplianceAlert);
  const { data, isLoading } = useQuery({ queryKey: ["startup-compliance"], queryFn: () => listFn() });

  const refresh = useMutation({
    mutationFn: () => refreshFn(),
    onSuccess: () => {
      toast.success(t("startup.compliance.refreshed"));
      qc.invalidateQueries({ queryKey: ["startup-compliance"] });
      qc.invalidateQueries({ queryKey: ["startup-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markDone = useMutation({
    mutationFn: (id: string) => updateFn({ id, status: "done" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["startup-compliance"] }),
  });

  return (
    <div className="space-y-4">
      <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
        {t("startup.compliance.refresh")}
      </Button>
      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      <div className="space-y-2">
        {(data?.alerts ?? []).map((a: { id: string; title: string; body: string | null; severity: string; status: string }) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex justify-between gap-3 items-start">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>{a.severity}</Badge>
                  {a.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
                </div>
                <p className="font-medium">{a.title}</p>
                {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
              </div>
              {a.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => markDone.mutate(a.id)}>
                  {t("startup.compliance.done")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RiskPanel() {
  const { t } = useTranslation();
  const predictFn = useTypedServerFn(getRiskPredictions);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["startup-risk"], queryFn: () => predictFn() });

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => refetch()}>{t("startup.risk.refresh")}</Button>
      {isLoading && <p>{t("common.loading")}</p>}
      {(data?.alerts ?? []).length === 0 && !isLoading && (
        <p className="text-muted-foreground">{t("startup.risk.empty")}</p>
      )}
      {(data?.alerts ?? []).map((a: { title: string; body: string; level: string }, i: number) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Badge variant={a.level === "critical" ? "destructive" : "secondary"} className="mb-2">{a.level}</Badge>
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GrowthPanel() {
  const { t } = useTranslation();
  const growthFn = useTypedServerFn(getGrowthDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["startup-growth"], queryFn: () => growthFn() });
  const m = data?.metrics;

  const items = [
    { label: "Burn Rate", value: m?.burnRate != null ? `${m.burnRate.toLocaleString()} دج/شهر` : "—" },
    { label: "Runway", value: m?.runwayMonths != null ? `${m.runwayMonths} شهر` : "—" },
    { label: "Growth Rate", value: m?.growthRate != null ? `${m.growthRate}%` : "—" },
    { label: "CAC", value: m?.cac != null ? `${m.cac.toLocaleString()} دج` : "—" },
    { label: "LTV", value: m?.ltv != null ? `${m.ltv.toLocaleString()} دج` : "—" },
    { label: "MRR", value: m?.mrr != null ? `${m.mrr.toLocaleString()} دج` : "—" },
  ];

  return (
    <div className="space-y-4">
      {isLoading && <p>{t("common.loading")}</p>}
      {!m?.hasData && !isLoading && (
        <p className="text-muted-foreground">{t("startup.growth.noData")}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((it) => (
          <Card key={it.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{it.label}</p>
              <p className="text-2xl font-bold">{it.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {m?.runwayMonths != null && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm mb-2">Runway</p>
            <Progress value={Math.min(100, (m.runwayMonths / 24) * 100)} />
          </CardContent>
        </Card>
      )}
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard/kpi">{t("startup.growth.addData")}</Link>
      </Button>
    </div>
  );
}

function StartupWorkPanel({ module }: { module: StartupWorkId }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const getFn = useTypedServerFn(getStartupWork);
  const genFn = useTypedServerFn(generateStartupWork);
  const { data } = useQuery({
    queryKey: ["startup-work", module],
    queryFn: () => getFn({ module }),
  });

  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  useEffect(() => {
    const w = data?.work as { project_title?: string; payload?: Record<string, string> } | null;
    if (!w) return;
    setProjectTitle(w.project_title ?? "");
    setProjectSummary(w.payload?.projectSummary ?? "");
    setExtraNotes(w.payload?.extraNotes ?? "");
  }, [data?.work]);

  const generate = useMutation({
    mutationFn: () =>
      genFn({
        module,
        projectTitle,
        projectSummary,
        extraNotes: extraNotes || undefined,
      }),
    onSuccess: () => {
      toast.success(t("startup.work.saved"));
      qc.invalidateQueries({ queryKey: ["startup-work", module] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = (data?.work as { report?: { sections?: Array<{ title: string; content: string }>; checklist?: string[]; blocks?: BmcBlocks } } | null)?.report;
  const bmcBlocks = report?.blocks;
  const emptyBmc: BmcBlocks = {
    customerSegments: "",
    valuePropositions: "",
    channels: "",
    customerRelationships: "",
    revenueStreams: "",
    keyResources: "",
    keyActivities: "",
    keyPartners: "",
    costStructure: "",
  };

  return (
    <div className="space-y-4">
      {module === "bmc" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("bmc.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessModelCanvas blocks={bmcBlocks ?? emptyBmc} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("startup.work.formTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t("startup.work.projectTitle")}</Label>
            <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("startup.work.projectSummary")}</Label>
            <Textarea value={projectSummary} onChange={(e) => setProjectSummary(e.target.value)} rows={6} />
          </div>
          <div>
            <Label>{t("startup.work.extraNotes")}</Label>
            <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={3} />
          </div>
          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || projectTitle.trim().length < 2 || projectSummary.trim().length < 20}
          >
            {generate.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {t("startup.work.generate")}
          </Button>
        </CardContent>
      </Card>

      {report?.sections && report.sections.length > 0 && module !== "bmc" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("startup.result")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {report.sections.map((s) => (
              <div key={s.title}>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground whitespace-pre-wrap mt-1">{s.content}</p>
              </div>
            ))}
            {report.checklist && report.checklist.length > 0 && (
              <ul className="list-disc list-inside text-muted-foreground space-y-1 border-t pt-3">
                {report.checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Label1275Panel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const runFn = useTypedServerFn(runLabel1275Assessment);
  const latestFn = useTypedServerFn(getLatestAssessment);
  const { data: latest } = useQuery({
    queryKey: ["startup-assessment", "label1275"],
    queryFn: () => latestFn({ kind: "label1275" }),
  });
  const [flags, setFlags] = useState({
    isInnovative: false,
    hasTechComponent: false,
    hasScalability: false,
    hasMarketStudy: false,
    hasPitchDeck: false,
    hasGrowthMetrics: false,
  });
  const [projectDescription, setDesc] = useState("");

  const run = useMutation({
    mutationFn: () => runFn({ ...flags, projectDescription }),
    onSuccess: () => {
      toast.success(t("startup.runDone"));
      qc.invalidateQueries({ queryKey: ["startup-assessment", "label1275"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = latest?.assessment?.report as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          {Object.keys(flags).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flags[k as keyof typeof flags]}
                onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))}
              />
              {t(`startup.label1275.${k}`)}
            </label>
          ))}
          <div>
            <Label>{t("startup.label1275.projectDescription")}</Label>
            <Textarea value={projectDescription} onChange={(e) => setDesc(e.target.value)} rows={5} />
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>{t("startup.label1275.run")}</Button>
        </CardContent>
      </Card>
      {latest?.assessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("startup.result")}: {latest.assessment.score}/100 — {String(report?.recommendedPath ?? "")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {typeof report?.advice === "string" && <p>{report.advice}</p>}
            {Array.isArray(report?.gaps) && (
              <ul className="list-disc list-inside text-muted-foreground">
                {(report.gaps as string[]).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
