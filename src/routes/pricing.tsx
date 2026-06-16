import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket } from "lucide-react";

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
  const plans = [
    { k: "free", featured: false, includes: ["features.ai", "features.lms"] },
    { k: "monthly", featured: true, includes: ["features.ai", "features.risk", "features.score", "features.investor", "features.lms"] },
    { k: "annual", featured: false, includes: ["features.ai", "features.risk", "features.score", "features.investor", "features.lms", "features.copilot"] },
  ] as const;

  const startupPlans = ["launch", "scale", "annual"] as const;
  const startupFeatures: Record<(typeof startupPlans)[number], string[]> = {
    launch: ["startup.services.readiness.title", "startup.services.compliance.title", "startup.services.growth.title", "startup.services.bmc.title"],
    scale: ["startup.services.investor.title", "startup.services.risk-ai.title", "startup.services.financial.title", "startup.services.compliance.title"],
    annual: ["startup.services.label1275.title", "features.copilot", "features.investor"],
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
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(({ k, featured, includes }) => (
              <Card key={k} className={featured ? "border-primary shadow-elegant relative" : "border-border/60"}>
                {featured && (
                  <Badge className="absolute -top-3 start-6">★</Badge>
                )}
                <CardContent className="p-8">
                  <h3 className="text-lg font-semibold">{t(`pricing.${k}.name`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`pricing.${k}.desc`)}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">{t(`pricing.${k}.price`)}</span>
                    <span className="text-muted-foreground">{t("pricing.currency")}</span>
                    {k !== "free" && (
                      <span className="text-muted-foreground text-sm ms-1">{t(`pricing.${k}.period`)}</span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {includes.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        {t(`${f}.title`)}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-8" variant={featured ? "default" : "outline"}>
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {k === "free" ? t("pricing.cta") : t("pricing.ctaPremium")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t pt-16" dir="rtl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Rocket className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">{t("pricing.startupSection.title")}</h2>
            </div>
            <p className="text-muted-foreground">{t("pricing.startupSection.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {startupPlans.map((k, i) => (
              <Card key={k} className={i === 1 ? "border-primary shadow-elegant relative" : "border-border/60"}>
                {i === 1 && <Badge className="absolute -top-3 start-6">Startup</Badge>}
                <CardContent className="p-8">
                  <h3 className="text-lg font-semibold">{t(`pricing.startupSection.${k}.name`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`pricing.startupSection.${k}.desc`)}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">{t(`pricing.startupSection.${k}.price`)}</span>
                    <span className="text-muted-foreground">{t("pricing.currency")}</span>
                    <span className="text-muted-foreground text-sm ms-1">{t(`pricing.startupSection.${k}.period`)}</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {startupFeatures[k].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        {f.startsWith("startup.") ? t(f) : t(`${f}.title`)}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-8" variant={i === 1 ? "default" : "outline"}>
                    <Link to="/auth" search={{ mode: "signup", accountType: "enterprise", accountSubtype: "Startup" }}>
                      {t("pricing.ctaPremium")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
