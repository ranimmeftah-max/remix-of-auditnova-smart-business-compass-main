import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPES, SUBTYPES } from "@/lib/account-types";

type Mode = "signin" | "signup";

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

type Wilaya = { code: number; name_ar: string; name_fr: string; name_en: string };

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — AuditNova" },
      { name: "description", content: "Sign in or create your free AuditNova account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);

  useEffect(() => {
    supabase
      .from("wilayas")
      .select("code,name_ar,name_fr,name_en")
      .order("code")
      .then(({ data }) => setWilayas(data ?? []));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Brand panel */}
      <aside className="hidden md:flex flex-col items-center justify-center gap-10 p-10 gradient-brand text-primary-foreground">
        <Logo size={240} variant="stacked" />
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold leading-tight">{t("brand.tagline")}</h2>
          <p className="mt-4 opacity-90">{t("landing.heroSubtitle")}</p>
        </div>
        <p className="text-sm opacity-70 text-center">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← {t("auth.back")}</Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/60">
            <CardContent className="p-8">
              <div className="md:hidden mb-8 flex justify-center">
                <Logo size={200} variant="stacked" />
              </div>
              <h1 className="text-2xl font-bold text-center">
                {mode === "signin" ? t("auth.welcome") : t("auth.createAccount")}
              </h1>

              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-6">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
                  <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <SignInForm />
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <SignUpForm wilayas={wilayas} locale={i18n.resolvedLanguage ?? "ar"} />
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin + "/dashboard",
                  });
                  if (result.error) toast.error(result.error.message);
                  else if (!result.redirected) navigate({ to: "/dashboard" });
                }}
              >
                {t("auth.google")}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth("apple", {
                    redirect_uri: window.location.origin + "/dashboard",
                  });
                  if (result.error) toast.error(result.error.message);
                  else if (!result.redirected) navigate({ to: "/dashboard" });
                }}
              >
                Apple
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

const signinSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function SignInForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const parsed = signinSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        setLoading(false);
        if (error) toast.error(error.message);
        else navigate({ to: "/dashboard" });
      }}
    >
      <div>
        <Label htmlFor="si-email">{t("auth.email")}</Label>
        <Input id="si-email" name="email" type="email" autoComplete="email" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="si-password">{t("auth.password")}</Label>
        <Input id="si-password" name="password" type="password" autoComplete="current-password" required className="mt-1" />
      </div>
      <div className="text-right rtl:text-left">
        <Link to="/reset-password" className="text-sm text-primary hover:underline">{t("auth.forgot")}</Link>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("common.loading") : t("auth.submitSignin")}
      </Button>
    </form>
  );
}

const signupSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  wilaya_code: z.string().min(1),
  password: z.string().min(6).max(72),
  confirm: z.string(),
  account_type: z.enum(ACCOUNT_TYPES),
  account_subtype: z.string().min(1),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "auth.passwordMismatch" });

function SignUpForm({ wilayas, locale }: { wilayas: Wilaya[]; locale: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<(typeof ACCOUNT_TYPES)[number]>("enterprise");
  const [subtype, setSubtype] = useState<string>(SUBTYPES.enterprise[0]);
  const [wilayaCode, setWilayaCode] = useState<string>("");

  const nameKey = locale === "fr" ? "name_fr" : locale === "en" ? "name_en" : "name_ar";

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          first_name: String(fd.get("first_name") ?? ""),
          last_name: String(fd.get("last_name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          wilaya_code: wilayaCode,
          password: String(fd.get("password") ?? ""),
          confirm: String(fd.get("confirm") ?? ""),
          account_type: accountType,
          account_subtype: subtype,
        };
        const parsed = signupSchema.safeParse(payload);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          toast.error(issue.message === "auth.passwordMismatch" ? t("auth.passwordMismatch") : issue.message);
          return;
        }
        setLoading(true);
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: {
              first_name: parsed.data.first_name,
              last_name: parsed.data.last_name,
              phone: parsed.data.phone,
              wilaya_code: parsed.data.wilaya_code,
              account_type: parsed.data.account_type,
              account_subtype: parsed.data.account_subtype,
              locale,
            },
          },
        });
        setLoading(false);
        if (error) { toast.error(error.message); return; }
        if (signUpData.session) {
          toast.success(t("auth.welcome", { defaultValue: "مرحباً بك" }));
          navigate({ to: "/dashboard" });
        } else {
          // Fallback: try immediate sign-in (auto-confirm enabled)
          const { error: siErr } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (siErr) toast.success(t("auth.checkEmail"));
          else navigate({ to: "/dashboard" });
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-first">{t("auth.firstName")}</Label>
          <Input id="su-first" name="first_name" required maxLength={60} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="su-last">{t("auth.lastName")}</Label>
          <Input id="su-last" name="last_name" required maxLength={60} className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="su-email">{t("auth.email")}</Label>
        <Input id="su-email" name="email" type="email" required maxLength={255} className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-phone">{t("auth.phone")}</Label>
          <Input id="su-phone" name="phone" type="tel" required maxLength={20} className="mt-1" />
        </div>
        <div>
          <Label>{t("auth.wilaya")}</Label>
          <Select value={wilayaCode} onValueChange={setWilayaCode}>
            <SelectTrigger className="mt-1"><SelectValue placeholder={t("auth.wilayaPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {wilayas.map((w) => (
                <SelectItem key={w.code} value={String(w.code)}>
                  {w.code}. {(w as unknown as Record<string, string>)[nameKey]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("auth.accountType")}</Label>
          <Select
            value={accountType}
            onValueChange={(v) => {
              const at = v as (typeof ACCOUNT_TYPES)[number];
              setAccountType(at);
              setSubtype(SUBTYPES[at][0]);
            }}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((a) => (
                <SelectItem key={a} value={a}>{t(`accounts.${a}.title`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("auth.accountSubtype")}</Label>
          <Select value={subtype} onValueChange={setSubtype}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBTYPES[accountType].map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`accounts.subtypes.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-pw">{t("auth.password")}</Label>
          <Input id="su-pw" name="password" type="password" required minLength={6} maxLength={72} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="su-cf">{t("auth.confirmPassword")}</Label>
          <Input id="su-cf" name="confirm" type="password" required minLength={6} maxLength={72} className="mt-1" />
        </div>
      </div>
      <Button type="submit" className="w-full mt-2" disabled={loading}>
        {loading ? t("common.loading") : t("auth.submitSignup")}
      </Button>
    </form>
  );
}
