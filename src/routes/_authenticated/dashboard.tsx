import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  account_type: "enterprise" | "professional" | "academic" | "investor";
  account_subtype: string | null;
};
type Subscription = { plan: string; status: string; trial_ends_at: string | null };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — AuditNova" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("first_name,last_name,account_type,account_subtype").eq("id", user.user.id).maybeSingle(),
        supabase.from("subscriptions").select("plan,status,trial_ends_at").eq("user_id", user.user.id).maybeSingle(),
      ]);
      setProfile(p as Profile | null);
      setSub(s as Subscription | null);
    })();
  }, []);

  const accountType = profile?.account_type ?? "enterprise";
  const name = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar accountType={accountType} accountSubtype={profile?.account_subtype} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-sm md:text-base truncate">
                {name ? t("dashboard.welcome", { name }) : t("nav.dashboard")}
              </h1>
              {profile && (
                <p className="text-[11px] md:text-xs text-muted-foreground truncate">
                  {t(`accounts.${accountType}.title`)}
                  {profile.account_subtype
                    ? ` · ${t(`accounts.subtypes.${profile.account_subtype}`, { defaultValue: profile.account_subtype })}`
                    : ""}
                </p>
              )}
            </div>
            </div>
            <div className="flex items-center gap-1">
              {sub?.status === "trialing" && sub.trial_ends_at && (
                <span className="hidden md:inline text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {t("dashboard.trialBadge", { date: new Date(sub.trial_ends_at).toLocaleDateString() })}
                </span>
              )}
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
