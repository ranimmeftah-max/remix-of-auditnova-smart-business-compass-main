import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ensureCdeAccount } from "@/lib/enterprise-access";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listCdeWorks } from "@/lib/cde.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, BarChart3, Grid3x3, Wrench, Calculator, Wallet, ArrowLeft, CheckCircle2,
} from "lucide-react";

const MODULES = [
  { id: "market", icon: BarChart3, color: "text-blue-600" },
  { id: "swot", icon: Grid3x3, color: "text-violet-600" },
  { id: "bmc", icon: BookOpen, color: "text-emerald-600" },
  { id: "technical", icon: Wrench, color: "text-amber-600" },
  { id: "costs", icon: Calculator, color: "text-rose-600" },
  { id: "financial", icon: Wallet, color: "text-cyan-600" },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard/cde")({
  beforeLoad: ensureCdeAccount,
  head: () => ({ meta: [{ title: "مذكرة CDE — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: CdeLayout,
});

function CdeLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/dashboard/cde") return <CdeHubPage />;
  return <Outlet />;
}

function CdeHubPage() {
  const { t } = useTranslation();
  const listFn = useTypedServerFn(listCdeWorks);
  const { data } = useQuery({ queryKey: ["cde-works"], queryFn: () => listFn() });
  const done = new Set((data?.works ?? []).map((w: { module: string }) => w.module));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">{t("cde.hub.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("cde.hub.subtitle")}</p>
        <Badge className="mt-2" variant="secondary">{t("cde.hub.badge")}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const completed = done.has(m.id);
          return (
            <Card key={m.id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${m.color}`} />
                  {t(`cde.modules.${m.id}.title`)}
                  {completed && <CheckCircle2 className="h-4 w-4 text-success mr-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t(`cde.modules.${m.id}.desc`)}</p>
                <Button asChild size="sm" className="w-full">
                  <Link to="/dashboard/cde/$module" params={{ module: m.id }}>
                    {completed ? t("cde.hub.edit") : t("cde.hub.start")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="ghost" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t("cde.hub.back")}
        </Link>
      </Button>
    </div>
  );
}
