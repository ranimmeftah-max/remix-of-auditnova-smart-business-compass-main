import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — AuditNova" },
      { name: "description", content: "AuditNova digitizes internal audit and tax compliance for Algerian SMEs and startups under the SCF framework." },
      { property: "og:title", content: "About AuditNova" },
      { property: "og:description", content: "Trust meets innovation — built for Algerian businesses." },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const values = [
    { k: "trust", Icon: Shield },
    { k: "innovation", Icon: Sparkles },
    { k: "impact", Icon: TrendingUp },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-center">{t("about.title")}</h1>
        <p className="mt-4 text-center text-muted-foreground text-lg">{t("about.subtitle")}</p>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">{t("about.missionTitle")}</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{t("about.missionText")}</p>
        </section>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">{t("about.valueTitle")}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {values.map(({ k, Icon }) => (
              <Card key={k} className="border-border/60">
                <CardContent className="p-6">
                  <Icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold">{t(`about.values.${k}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`about.values.${k}.desc`)}</p>
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
