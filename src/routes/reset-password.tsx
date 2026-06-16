import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — AuditNova" },
      { name: "description", content: "Reset your AuditNova password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-6"><Logo /></Link>
      <Card className="w-full max-w-md border-border/60">
        <CardContent className="p-8">
          <h1 className="text-2xl font-bold text-center">{t("reset.title")}</h1>
          {isRecovery ? (
            <form
              className="space-y-4 mt-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const password = String(fd.get("password") ?? "");
                if (password.length < 6) return toast.error("min 6");
                setLoading(true);
                const { error } = await supabase.auth.updateUser({ password });
                setLoading(false);
                if (error) toast.error(error.message);
                else { toast.success(t("reset.updated")); window.location.href = "/dashboard"; }
              }}
            >
              <div>
                <Label htmlFor="np">{t("reset.newPassword")}</Label>
                <Input id="np" name="password" type="password" required minLength={6} maxLength={72} className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.loading") : t("reset.submit")}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4 mt-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const email = String(fd.get("email") ?? "");
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin + "/reset-password",
                });
                setLoading(false);
                if (error) toast.error(error.message);
                else toast.success(t("reset.sent"));
              }}
            >
              <div>
                <Label htmlFor="re">{t("auth.email")}</Label>
                <Input id="re" name="email" type="email" required maxLength={255} className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.loading") : t("reset.request")}
              </Button>
            </form>
          )}
          <div className="text-center mt-6">
            <Link to="/auth" search={{ mode: "signin" }} className="text-sm text-muted-foreground hover:text-foreground">
              ← {t("auth.back")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
