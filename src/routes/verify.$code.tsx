import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { verifyCertificate } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify Certificate ${params.code} — AuditNova` },
      { name: "description", content: "Verify the authenticity of an AuditNova course certificate." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const fn = useServerFn(verifyCertificate);
  const { data, isLoading } = useQuery({
    queryKey: ["verify", code],
    queryFn: () => fn({ data: { code } }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-xl w-full border-border/60">
          <CardContent className="p-8 text-center">
            {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
            {!isLoading && data?.valid && data.certificate && (
              <>
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-9 w-9 text-success" />
                </div>
                <h1 className="text-2xl font-bold">{t("lms.verifyValid")}</h1>
                <div className="mt-6 space-y-3 text-start">
                  <Row label={t("lms.verifyCourse")} value={data.certificate.course?.title ?? "—"} />
                  <Row label={t("lms.verifyLearner")} value={data.certificate.learner || "—"} />
                  <Row label={t("lms.issuedOn", { date: "" }).replace("{{date}}", "").trim() || "Issued on"}
                       value={new Date(data.certificate.issued_at).toLocaleDateString()} />
                  <Row label="Code" value={data.certificate.code} mono />
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Award className="h-4 w-4" /> AuditNova LMS
                </div>
              </>
            )}
            {!isLoading && !data?.valid && (
              <>
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-9 w-9 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">{t("lms.verifyInvalid")}</h1>
                <p className="text-muted-foreground mt-2">{t("lms.verifyInvalidDesc")}</p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono break-all" : ""}`}>{value}</span>
    </div>
  );
}
