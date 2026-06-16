import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { SubscribeDialog, SubscribeSection } from "@/components/SubscribeForm";
import type { SubscriptionPlanId } from "@/lib/account-types";

function formatPrice(raw: string) {
  const n = Number(raw.replace(/[\s,\u00a0\u202f]/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("fr-DZ", { maximumFractionDigits: 0 }) : raw;
}

function PlanPrice({
  priceKey,
  periodKey,
  showPeriod = true,
}: {
  priceKey: string;
  periodKey?: string;
  showPeriod?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 inline-flex items-baseline gap-1 tabular-nums" dir="ltr">
      <span className="text-4xl font-extrabold">{formatPrice(t(priceKey))}</span>
      <span className="text-muted-foreground">{t("pricing.currency")}</span>
      {showPeriod && periodKey && (
        <span className="text-muted-foreground text-sm">{t(periodKey)}</span>
      )}
    </div>
  );
}

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AuditNova" },
      { name: "description", content: "Simple, flexible pricing for SMEs, professionals, students and investors. Start free, upgrade when you grow." },
      { property: "og:title", content: "Pricing — AuditNova" },
      { property: "og:description", content: "Free plan + monthly and annual subscriptions. 50% discount for students and professors." },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation();
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribePlan, setSubscribePlan] = useState<SubscriptionPlanId>("student_plus");

  const openSubscribe = (plan: SubscriptionPlanId) => {
    setSubscribePlan(plan);
    setSubscribeOpen(true);
  };

  const plans = [
    { k: "discovery", featured: true, cta: "signup" },
    { k: "student_plus", featured: false, cta: "subscribe" },
    { k: "mentor_pro", featured: false, cta: "subscribe" },
    { k: "startup", featured: false, cta: "subscribe" },
    { k: "incubator", featured: false, cta: "subscribe" },
    { k: "enterprise", featured: false, cta: "contact" },
  ] as const satisfies ReadonlyArray<{ k: SubscriptionPlanId; featured: boolean; cta: "signup" | "subscribe" | "contact" }>;

  const planFeatures: Record<SubscriptionPlanId, string[]> = {
    discovery: ["account", "1275", "upload", "progress", "library"],
    student_plus: ["ai_thesis", "swot", "bmc", "pitch", "readiness", "innovation"],
    mentor_pro: ["multi_projects", "student_followup", "evaluation", "reports", "feedback", "mentor_dashboard"],
    startup: ["pro_dashboard", "growth_kpis", "risk", "tasks", "investors", "performance_reports", "investment_readiness"],
    incubator: ["unlimited_students", "mentor_management", "project_management", "stats", "readiness_classification", "incubator_kpis", "ai_evaluation", "pdf_reports"],
    enterprise: ["custom_users_services"],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 space-y-20">
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold">{t("pricing.title")}</h1>
            <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
            <Badge variant="secondary" className="mt-4">{t("pricing.trial")}</Badge>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map(({ k, featured, cta }) => (
              <Card key={k} className={featured ? "border-primary shadow-elegant relative" : "border-border/60"}>
                {featured && <Badge className="absolute -top-3 start-6">★</Badge>}
                <CardContent className="p-8">
                  <h3 className="text-lg font-semibold">{t(`pricing.plans.${k}.name`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`pricing.plans.${k}.desc`)}</p>

                  {k === "enterprise" ? (
                    <div className="mt-6">
                      <span className="text-2xl font-extrabold">{t("pricing.plans.enterprise.customPrice")}</span>
                    </div>
                  ) : (
                    <PlanPrice
                      priceKey={`pricing.plans.${k}.price`}
                      periodKey={`pricing.plans.${k}.period`}
                      showPeriod={k !== "discovery"}
                    />
                  )}

                  <ul className="mt-6 space-y-2 text-sm">
                    {planFeatures[k].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        {t(`pricing.plans.${k}.features.${f}`)}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 space-y-2 text-sm">
                    {t(`pricing.plans.${k}.goal`, { defaultValue: "" }) ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{t("pricing.labels.goal")}:</span> {t(`pricing.plans.${k}.goal`)}
                      </p>
                    ) : null}
                    {t(`pricing.plans.${k}.value`, { defaultValue: "" }) ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{t("pricing.labels.value")}:</span> {t(`pricing.plans.${k}.value`)}
                      </p>
                    ) : null}
                    {t(`pricing.plans.${k}.target`, { defaultValue: "" }) ? (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{t("pricing.labels.target")}:</span> {t(`pricing.plans.${k}.target`)}
                      </p>
                    ) : null}
                  </div>

                  {cta === "signup" ? (
                    <Button asChild className="w-full mt-8" variant="outline">
                      <Link to="/auth" search={{ mode: "signup" }}>
                        {t("pricing.cta")}
                      </Link>
                    </Button>
                  ) : cta === "contact" ? (
                    <Button asChild className="w-full mt-8" variant="outline">
                      <Link to="/contact">{t("pricing.ctaContact")}</Link>
                    </Button>
                  ) : (
                    <Button className="w-full mt-8" variant={featured ? "default" : "outline"} onClick={() => openSubscribe(k)}>
                      {t("pricing.ctaPremium")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <SubscribeSection />
      </main>
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} defaultPlan={subscribePlan} />
      <SiteFooter />
    </div>
  );
}
