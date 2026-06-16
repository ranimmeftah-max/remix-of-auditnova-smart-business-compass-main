import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BrainCircuit, ShieldAlert, Gauge, Handshake, GraduationCap, Rocket,
  ArrowRight, CheckCircle2, Building2, Briefcase, BookOpen, Coins,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AuditNova — AI Audit & Compliance for Algerian SMEs" },
      { name: "description", content: "Automate internal audit, tax compliance, learning and startup incubation with AuditNova — built for Algeria's SCF." },
      { property: "og:title", content: "AuditNova — Trust Meets Innovation" },
      { property: "og:description", content: "AI-powered audit & compliance platform for Algerian SMEs and startups." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { k: "ai", Icon: BrainCircuit },
    { k: "risk", Icon: ShieldAlert },
    { k: "score", Icon: Gauge },
    { k: "investor", Icon: Handshake },
    { k: "lms", Icon: GraduationCap },
    { k: "copilot", Icon: Rocket },
  ];

  const accounts = [
    { k: "enterprise", Icon: Building2 },
    { k: "professional", Icon: Briefcase },
    { k: "academic", Icon: BookOpen },
    { k: "investor", Icon: Coins },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div className="container mx-auto px-4 py-20 md:py-32 text-center">
            <Badge variant="secondary" className="mb-6">
              {t("landing.heroEyebrow")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto">
              <span className="text-gradient-brand">{t("landing.heroTitle")}</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="shadow-elegant">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("landing.ctaStart")} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/features">{t("landing.ctaExplore")}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {t("common.freeTrial")}
            </p>
          </div>
        </section>

        {/* FEATURES */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing.featuresTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ k, Icon }) => (
              <Card key={k} className="group hover:shadow-elegant transition-shadow border-border/60">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{t(`features.${k}.title`)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`features.${k}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ACCOUNTS */}
        <section className="bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">{t("landing.accountsTitle")}</h2>
              <p className="mt-3 text-muted-foreground">{t("landing.accountsSubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {accounts.map(({ k, Icon }) => (
                <Link
                  key={k}
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary hover:shadow-elegant transition-all"
                >
                  <Icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold">{t(`accounts.${k}.title`)}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t(`accounts.${k}.desc`)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="rounded-3xl gradient-brand text-primary-foreground p-10 md:p-16 text-center shadow-elegant">
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing.ctaBottom")}</h2>
            <p className="mt-3 opacity-90">{t("landing.ctaBottomDesc")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>{t("landing.ctaStart")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
