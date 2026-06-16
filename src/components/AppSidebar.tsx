import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Bot, Bell, MessageSquare, FileText,
  Building2, Gauge, ShieldAlert, TrendingUp, Briefcase, Users, BookOpen,
  Award, GraduationCap, Search, Scale, FolderKanban, LogOut, Rocket,
  Calculator, Receipt, Wallet, BookMarked, UserCheck, PenLine, Sparkles,
} from "lucide-react";
import { Logo } from "./Logo";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStartup, isMicroEnterprise, isSme } from "@/lib/enterprise-access";

type AccountType = "enterprise" | "professional" | "academic" | "investor";

type Item = { titleKey: string; url: string; icon: LucideIcon };

const SHARED: Item[] = [
  { titleKey: "dashboard.welcome", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "dashboard.aiChat", url: "/dashboard/ai-chat", icon: Bot },
  { titleKey: "dashboard.notifications", url: "/dashboard/notifications", icon: Bell },
  { titleKey: "dashboard.messages", url: "/dashboard/messages", icon: MessageSquare },
  { titleKey: "dashboard.documents", url: "/dashboard/documents", icon: FileText },
];

const BY_TYPE: Record<AccountType, Item[]> = {
  enterprise: [
    { titleKey: "sidebar.company", url: "/dashboard/company", icon: Building2 },
    { titleKey: "sidebar.myListings", url: "/dashboard/my-listings", icon: FolderKanban },
    { titleKey: "sidebar.audit", url: "/dashboard/audit", icon: Bot },
    { titleKey: "sidebar.health", url: "/dashboard/health", icon: Gauge },
    { titleKey: "sidebar.investment", url: "/dashboard/investment", icon: TrendingUp },
    { titleKey: "sidebar.kpi", url: "/dashboard/kpi", icon: Gauge },
    { titleKey: "sidebar.risk", url: "/dashboard/risk", icon: ShieldAlert },
    { titleKey: "sidebar.reports", url: "/dashboard/reports", icon: FileText },
  ],
  professional: [
    { titleKey: "sidebar.clients", url: "/dashboard/clients", icon: Users },
    { titleKey: "sidebar.workspace", url: "/dashboard/workspace", icon: Briefcase },
    { titleKey: "sidebar.analysis", url: "/dashboard/analysis", icon: TrendingUp },
    { titleKey: "sidebar.risk", url: "/dashboard/risk", icon: ShieldAlert },
    { titleKey: "sidebar.compliance", url: "/dashboard/compliance", icon: Scale },
    { titleKey: "sidebar.reports", url: "/dashboard/reports", icon: FileText },
    { titleKey: "sidebar.appointments", url: "/dashboard/appointments", icon: Bell },
  ],
  academic: [],
  investor: [
    { titleKey: "sidebar.discovery", url: "/dashboard/discovery", icon: Search },
    { titleKey: "sidebar.evaluation", url: "/dashboard/evaluation", icon: Gauge },
    { titleKey: "sidebar.comparison", url: "/dashboard/comparison", icon: TrendingUp },
    { titleKey: "sidebar.diligence", url: "/dashboard/diligence", icon: Scale },
    { titleKey: "sidebar.portfolio", url: "/dashboard/portfolio", icon: FolderKanban },
  ],
};

const TAX: Item[] = [
  { titleKey: "sidebar.g50", url: "/dashboard/g50", icon: Calculator },
  { titleKey: "sidebar.payroll", url: "/dashboard/payroll", icon: Wallet },
  { titleKey: "sidebar.invoices", url: "/dashboard/invoices", icon: Receipt },
  { titleKey: "sidebar.scf", url: "/dashboard/scf", icon: BookOpen },
  { titleKey: "sidebar.annualTax", url: "/dashboard/annual-tax", icon: Scale },
  { titleKey: "sidebar.legalLibrary", url: "/dashboard/legal-library", icon: BookMarked },
];

const ACADEMIC_STUDENT: Item[] = [
  { titleKey: "sidebar.learning", url: "/dashboard/learning", icon: BookOpen },
  { titleKey: "sidebar.courses", url: "/dashboard/courses", icon: GraduationCap },
  { titleKey: "sidebar.quizzes", url: "/dashboard/quizzes", icon: Sparkles },
  { titleKey: "sidebar.certificates", url: "/dashboard/certificates", icon: Award },
  { titleKey: "sidebar.progress", url: "/dashboard/progress", icon: TrendingUp },
];

const ACADEMIC_PROFESSOR: Item[] = [
  { titleKey: "sidebar.teaching", url: "/dashboard/teaching", icon: PenLine },
  { titleKey: "sidebar.enrollments", url: "/dashboard/enrollments", icon: UserCheck },
  { titleKey: "sidebar.learning", url: "/dashboard/learning", icon: BookOpen },
];

function academicItems(subtype: string | null | undefined): Item[] {
  if (subtype === "Professor") return ACADEMIC_PROFESSOR;
  return ACADEMIC_STUDENT;
}

const CDE_HUB: Item = {
  titleKey: "sidebar.cdeHub",
  url: "/dashboard/cde",
  icon: BookMarked,
};

const STARTUP_HUB: Item = {
  titleKey: "sidebar.startupHub",
  url: "/dashboard/startup",
  icon: Rocket,
};

const SME_HUB: Item = {
  titleKey: "sidebar.smeHub",
  url: "/dashboard/sme",
  icon: Briefcase,
};

const SME_ENTERPRISE: Item[] = [
  { titleKey: "sidebar.company", url: "/dashboard/company", icon: Building2 },
  { titleKey: "sidebar.reports", url: "/dashboard/reports", icon: FileText },
];

function enterpriseItems(subtype: string | null | undefined): Item[] {
  if (isStartup(subtype)) return [STARTUP_HUB, ...BY_TYPE.enterprise];
  if (isMicroEnterprise(subtype)) return [CDE_HUB, ...BY_TYPE.enterprise];
  if (isSme(subtype)) return [SME_HUB, ...SME_ENTERPRISE];
  return BY_TYPE.enterprise;
}

export function AppSidebar({
  accountType,
  accountSubtype,
}: {
  accountType: AccountType;
  accountSubtype?: string | null;
}) {
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items =
    accountType === "academic"
      ? academicItems(accountSubtype)
      : accountType === "enterprise"
        ? enterpriseItems(accountSubtype)
        : (BY_TYPE[accountType] ?? BY_TYPE.enterprise);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-2"><Logo size={28} /></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.overview")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SHARED.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path === i.url}>
                    <Link to={i.url}>
                      <i.icon className="h-4 w-4" />
                      <span>{t(i.titleKey, { name: "" }).replace(",", "").trim() || t(i.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(accountType === "enterprise" || accountType === "professional") && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.taxModule")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {TAX.map((i) => (
                  <SidebarMenuItem key={i.url}>
                    <SidebarMenuButton asChild isActive={path === i.url}>
                      <Link to={i.url}>
                        <i.icon className="h-4 w-4" />
                        <span>{t(i.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t(`accounts.${accountType}.title`)}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path === i.url}>
                    <Link to={i.url}>
                      <i.icon className="h-4 w-4" />
                      <span>{t(i.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>{t("nav.signout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
