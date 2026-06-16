import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ShieldAlert, Gauge, Handshake, GraduationCap, Rocket } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — AuditNova" },
      { name: "description", content: "Explore AuditNova's AI audit assistant, risk detection, maturity score, investor matching, learning center, and incubation copilot." },
      { property: "og:title", content: "Features — AuditNova" },
      { property: "og:description", content: "AI-powered audit, risk, learning and incubation features for SMEs and startups." },
    ],
    links: [{ rel: "canonical", href: "/features" }],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { t } = useTranslation();
  const items = [
    { k: "ai", Icon: BrainCircuit },
    { k: "risk", Icon: ShieldAlert },
    { k: "score", Icon: Gauge },
    { k: "investor", Icon: Handshake },
    { k: "lms", Icon: GraduationCap },
    { k: "copilot", Icon: Rocket },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">{t("landing.featuresTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("landing.featuresSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ k, Icon }) => (
            <Card key={k} className="border-border/60">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold">{t(`features.${k}.title`)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t(`features.${k}.desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>{t("landing.ctaStart")}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
