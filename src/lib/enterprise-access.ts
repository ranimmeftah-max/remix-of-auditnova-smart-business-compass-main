import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export type EnterpriseProfile = {
  account_type: string;
  account_subtype: string | null;
};

export function isStartup(subtype: string | null | undefined) {
  return subtype?.toLowerCase() === "startup";
}

export function isMicroEnterprise(subtype: string | null | undefined) {
  return subtype === "Micro Enterprise";
}

export function isSme(subtype: string | null | undefined) {
  return subtype === "SME";
}

export function hasCdeAccess(accountType: string | null | undefined, subtype: string | null | undefined) {
  return accountType === "enterprise" && isMicroEnterprise(subtype);
}

export function isEnterprise(accountType: string | null | undefined) {
  return accountType === "enterprise";
}

export async function getEnterpriseProfile(): Promise<EnterpriseProfile | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("account_type,account_subtype")
    .eq("id", user.user.id)
    .maybeSingle();
  return data as EnterpriseProfile | null;
}

export async function ensureStartupAccount() {
  const profile = await getEnterpriseProfile();
  if (!profile || profile.account_type !== "enterprise" || !isStartup(profile.account_subtype)) {
    throw redirect({ to: "/dashboard" });
  }
}

export async function ensureCdeAccount() {
  const profile = await getEnterpriseProfile();
  if (!profile || !hasCdeAccess(profile.account_type, profile.account_subtype)) {
    throw redirect({ to: "/dashboard" });
  }
}

export async function ensureSmeAccount() {
  const profile = await getEnterpriseProfile();
  if (!profile || profile.account_type !== "enterprise" || !isSme(profile.account_subtype)) {
    throw redirect({ to: "/dashboard" });
  }
}

async function loadProfile(supabaseClient: { from: typeof supabase.from }, userId: string) {
  const { data } = await supabaseClient
    .from("profiles")
    .select("account_type,account_subtype")
    .eq("id", userId)
    .maybeSingle();
  return data as EnterpriseProfile | null;
}

export const requireEnterpriseAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (profile?.account_type !== "enterprise") {
    throw new Error("هذه الصفحة مخصصة لحسابات المؤسسات فقط");
  }
  return next({ context: { ...context, enterpriseProfile: profile } });
});

export const requireStartupAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (profile?.account_type !== "enterprise" || !isStartup(profile.account_subtype)) {
    throw new Error("هذه الصفحة مخصصة للمؤسسات الناشئة (Startup) فقط");
  }
  return next({ context: { ...context, enterpriseProfile: profile } });
});

export const requireCdeAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (!hasCdeAccess(profile?.account_type, profile?.account_subtype)) {
    throw new Error("مذكرة CDE متاحة لحساب Micro Enterprise فقط");
  }
  return next({ context: { ...context, enterpriseProfile: profile } });
});

export const requireSmeAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (profile?.account_type !== "enterprise" || !isSme(profile.account_subtype)) {
    throw new Error("هذه الصفحة مخصصة لحساب SME فقط");
  }
  return next({ context: { ...context, enterpriseProfile: profile } });
});
