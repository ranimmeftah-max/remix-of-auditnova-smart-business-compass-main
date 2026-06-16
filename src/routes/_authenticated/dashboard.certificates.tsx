import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { myCertificates } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, ShieldCheck } from "lucide-react";
import { exportCertificatePdf } from "@/lib/export-certificate-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/certificates")({
  beforeLoad: ensureAcademicAccount,
  head: () => ({ meta: [{ title: "شهاداتي — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { t } = useTranslation();
  const fetchFn = useServerFn(myCertificates);
  const { data, isLoading } = useQuery({ queryKey: ["my-certificates"], queryFn: () => fetchFn() });
  const certs = (data?.certificates ?? []) as Array<{
    id: string;
    verification_code: string;
    issued_at: string;
    course: { title: string; slug: string; cover_url: string | null } | null;
  }>;

  const downloadPdf = (cert: typeof certs[number]) => {
    try {
      exportCertificatePdf({
        courseTitle: cert.course?.title ?? "—",
        issuedAt: cert.issued_at,
        verificationCode: cert.verification_code,
        verifyUrl: `${window.location.origin}/verify/${cert.verification_code}`,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Award className="h-7 w-7 text-primary" />
          {t("lms.certificates")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("lms.certificatesSubtitle")}</p>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {!isLoading && certs.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {t("lms.noCertificates")}
          <div className="mt-4"><Button asChild><Link to="/dashboard/learning">{t("lms.browse")}</Link></Button></div>
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {certs.map((c) => (
          <Card key={c.id} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{c.course?.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("lms.issuedOn", { date: new Date(c.issued_at).toLocaleDateString() })}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                    {c.verification_code}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => downloadPdf(c)}>
                  <Download className="h-4 w-4 me-2" />{t("lms.download")}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/verify/$code" params={{ code: c.verification_code }} target="_blank">
                    <ShieldCheck className="h-4 w-4 me-2" />{t("lms.verify")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
