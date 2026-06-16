import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ensureStartupAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getStartupOverview } from "@/lib/startup.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket, ClipboardCheck, TrendingUp, Shield, Brain, BarChart3, Award,
  GraduationCap, ArrowLeft, AlertCircle, BookOpen, Wallet,
} from "lucide-react";

const SERVICES = [
  { id: "readiness", icon: ClipboardCheck, color: "text-blue-600" },
  { id: "investor", icon: TrendingUp, color: "text-emerald-600" },
  { id: "compliance", icon: Shield, color: "text-amber-600" },
  { id: "risk-ai", icon: Brain, color: "text-rose-600" },
  { id: "growth", icon: BarChart3, color: "text-cyan-600" },
  { id: "bmc", icon: BookOpen, color: "text-violet-600" },
  { id: "financial", icon: Wallet, color: "text-indigo-600" },
  { id: "label1275", icon: Award, color: "text-orange-600" },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard/startup")({
  beforeLoad: ensureStartupAccount,
  head: () => ({ meta: [{ title: "خدمات Startup — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: StartupLayout,
});

function StartupLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/dashboard/startup") return <StartupHubPage />;
  return <Outlet />;
}

function StartupHubPage() {
  const { t } = useTranslation();
  const overviewFn = useTypedServerFn(getStartupOverview);
  const { data, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["startup-overview"],
    queryFn: () => overviewFn(),
    retry: 1,
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <Rocket className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("startup.hub.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("startup.hub.subtitle")}</p>
        </div>
      </div>

      {isError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{(error as Error)?.message ?? t("startup.hub.loadError")}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()} disabled={isFetching}>
              {t("startup.hub.retry")}
            </Button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("startup.hub.readinessScore")}</p>
            <p className="text-3xl font-bold text-primary">
              {data?.readinessScore ?? "—"}
              {data?.readinessScore != null && <span className="text-lg text-muted-foreground">/100</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Runway</p>
            <p className="text-3xl font-bold">
              {data?.growth?.runwayMonths != null ? `${data.growth.runwayMonths}` : "—"}
              {data?.growth?.runwayMonths != null && <span className="text-sm text-muted-foreground"> شهر</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("startup.hub.riskAlerts")}</p>
            <p className="text-3xl font-bold">{data?.riskAlertCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("startup.hub.complianceOpen")}</p>
            <p className="text-3xl font-bold">{data?.openCompliance ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-semibold mb-4">{t("startup.hub.servicesTitle")}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${s.color}`} />
                    {t(`startup.services.${s.id}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t(`startup.services.${s.id}.desc`)}</p>
                  <Badge variant="secondary">{t(`startup.pricing.${s.id}`)}</Badge>
                  <Button asChild size="sm" className="w-full">
                    <Link to="/dashboard/startup/$service" params={{ service: s.id }}>
                      {t("startup.hub.open")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {t("startup.cdeGuide.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{t("startup.cdeGuide.intro")}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-medium">{t("startup.cdeGuide.cdeTitle")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {(t("startup.cdeGuide.cdeItems", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-medium">{t("startup.cdeGuide.incubatorTitle")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {(t("startup.cdeGuide.incubatorItems", { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="font-medium">{t("startup.cdeGuide.conclusion")}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/startup/$service" params={{ service: "label1275" }}>
              {t("startup.cdeGuide.cta")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("startup.hub.back")}
        </Link>
      </Button>
    </div>
  );
}
