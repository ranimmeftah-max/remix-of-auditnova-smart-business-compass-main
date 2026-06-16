import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AuditNova" },
      { name: "description", content: "Get in touch with the AuditNova team." },
      { property: "og:title", content: "Contact AuditNova" },
      { property: "og:description", content: "We're here to help." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl">
        <h1 className="text-4xl font-bold text-center">{t("contact.title")}</h1>
        <p className="mt-3 text-center text-muted-foreground">{t("contact.subtitle")}</p>
        <form
          className="mt-10 space-y-4"
          onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success(t("contact.sent")); }}
        >
          <div>
            <Label htmlFor="name">{t("contact.name")}</Label>
            <Input id="name" required maxLength={100} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">{t("contact.email")}</Label>
            <Input id="email" type="email" required maxLength={255} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="message">{t("contact.message")}</Label>
            <Textarea id="message" required maxLength={1000} rows={5} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={sent}>
            {sent ? t("contact.sent") : t("contact.send")}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
