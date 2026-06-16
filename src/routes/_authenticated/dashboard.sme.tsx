import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ensureSmeAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getSmeOverview } from "@/lib/sme.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Bot, ShieldAlert, Gauge, ClipboardCheck, Scale, Sparkles,
  ArrowLeft, AlertCircle,
} from "lucide-react";

const SERVICES = [
  { id: "ai-audit", icon: Bot, color: "text-blue-600" },
  { id: "risk", icon: ShieldAlert, color: "text-rose-600" },
  { id: "kpi", icon: Gauge, color: "text-emerald-600" },
  { id: "internal-control", icon: ClipboardCheck, color: "text-amber-600" },
  { id: "legal-compliance", icon: Scale, color: "text-indigo-600" },
  { id: "ai-assistant", icon: Sparkles, color: "text-violet-600" },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard/sme")({
  beforeLoad: ensureSmeAccount,
  head: () => ({ meta: [{ title: "خدمات SME — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: SmeLayout,
});

function SmeLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/dashboard/sme") return <SmeHubPage />;
  return <Outlet />;
}

function SmeHubPage() {
  const { t } = useTranslation();
  const overviewFn = useTypedServerFn(getSmeOverview);
  const { data, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["sme-overview"],
    queryFn: () => overviewFn(),
    retry: 1,
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <Briefcase className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("sme.hub.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("sme.hub.subtitle")}</p>
        </div>
      </div>

      {isError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{(error as Error)?.message ?? t("sme.hub.loadError")}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()} disabled={isFetching}>
              {t("sme.hub.retry")}
            </Button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("sme.hub.auditReports")}</p>
            <p className="text-3xl font-bold text-primary">{data?.auditCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("sme.hub.riskAlerts")}</p>
            <p className="text-3xl font-bold">{data?.riskAlertCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("sme.hub.controlScore")}</p>
            <p className="text-3xl font-bold">
              {data?.controlScore ?? "—"}
              {data?.controlScore != null && <span className="text-lg text-muted-foreground">/100</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("sme.hub.dueObligations")}</p>
            <p className="text-3xl font-bold">{data?.dueObligations ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-4">{t("sme.hub.servicesTitle")}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${s.color}`} />
                    {t(`sme.services.${s.id}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t(`sme.services.${s.id}.desc`)}</p>
                  <Badge variant="secondary">{t(`sme.pricing.${s.id}`)}</Badge>
                  <Button asChild size="sm" className="w-full">
                    <Link to="/dashboard/sme/$service" params={{ service: s.id }}>
                      {t("sme.hub.open")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Button variant="ghost" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("sme.hub.back")}
        </Link>
      </Button>
    </div>
  );
}
