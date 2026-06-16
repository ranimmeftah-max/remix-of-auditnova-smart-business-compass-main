import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ensureCdeAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { cdeModuleIds, generateCdeWork, getCdeWork } from "@/lib/cde.functions";
import { BusinessModelCanvas } from "@/components/BusinessModelCanvas";
import { FinancialPlanBuilder } from "@/components/FinancialPlanBuilder";
import type { BmcBlocks } from "@/lib/bmc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/cde/$module")({
  beforeLoad: ensureCdeAccount,
  component: CdeModulePage,
});

function CdeModulePage() {
  const { module } = Route.useParams();

  if (!cdeModuleIds.includes(module as (typeof cdeModuleIds)[number])) {
    return <div className="p-8 text-destructive">وحدة غير موجودة</div>;
  }

  if (module === "financial") {
    return <FinancialPlanBuilder backUrl="/dashboard/cde" backLabelKey="cde.hub.back" />;
  }

  return <CdeStandardModule mod={module as (typeof cdeModuleIds)[number]} />;
}

function CdeStandardModule({ mod }: { mod: (typeof cdeModuleIds)[number] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const getFn = useTypedServerFn(getCdeWork);
  const genFn = useTypedServerFn(generateCdeWork);
  const { data } = useQuery({
    queryKey: ["cde-work", mod],
    queryFn: () => getFn({ module: mod }),
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
        module: mod,
        projectTitle,
        projectSummary,
        extraNotes: extraNotes || undefined,
      }),
    onSuccess: () => {
      toast.success(t("cde.saved"));
      qc.invalidateQueries({ queryKey: ["cde-work", mod] });
      qc.invalidateQueries({ queryKey: ["cde-works"] });
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
    <div className={`p-4 md:p-6 mx-auto space-y-6 ${mod === "bmc" ? "max-w-6xl" : "max-w-4xl"}`} dir="rtl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/dashboard/cde">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("cde.hub.back")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{t(`cde.modules.${mod}.title`)}</h1>
        <p className="text-muted-foreground mt-1">{t(`cde.modules.${mod}.longDesc`)}</p>
      </div>

      {mod === "bmc" && (
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
          <CardTitle className="text-base">{t("cde.form.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t("cde.form.projectTitle")}</Label>
            <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("cde.form.projectSummary")}</Label>
            <Textarea value={projectSummary} onChange={(e) => setProjectSummary(e.target.value)} rows={6} />
          </div>
          <div>
            <Label>{t("cde.form.extraNotes")}</Label>
            <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={3} />
          </div>
          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || projectTitle.trim().length < 2 || projectSummary.trim().length < 20}
          >
            {generate.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {t("cde.form.generate")}
          </Button>
        </CardContent>
      </Card>

      {report?.sections && report.sections.length > 0 && mod !== "bmc" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cde.result")}</CardTitle>
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
