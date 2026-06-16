import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export type AcademicProfile = {
  account_type: string;
  account_subtype: string | null;
};

export function isProfessor(subtype: string | null | undefined) {
  return subtype === "Professor";
}

export function isStudent(subtype: string | null | undefined) {
  return subtype === "Student" || subtype === "Researcher" || !subtype;
}

export async function getAcademicProfile(): Promise<AcademicProfile | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("account_type,account_subtype")
    .eq("id", user.user.id)
    .maybeSingle();
  return data as AcademicProfile | null;
}

export async function ensureAcademicAccount() {
  const profile = await getAcademicProfile();
  if (!profile || profile.account_type !== "academic") throw redirect({ to: "/dashboard" });
}

export async function ensureProfessorAccount() {
  const profile = await getAcademicProfile();
  if (!profile || profile.account_type !== "academic" || !isProfessor(profile.account_subtype)) {
    throw redirect({ to: "/dashboard" });
  }
}

async function loadProfile(supabaseClient: { from: typeof supabase.from }, userId: string) {
  const { data } = await supabaseClient
    .from("profiles")
    .select("account_type,account_subtype")
    .eq("id", userId)
    .maybeSingle();
  return data as AcademicProfile | null;
}

export const requireAcademicAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (profile?.account_type !== "academic") {
    throw new Error("مركز التعلم متاح لحساب Academic فقط");
  }
  return next({ context: { ...context, academicProfile: profile } });
});

export const requireProfessorAccount = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const supabaseClient = context?.supabase;
  const userId = context?.userId;
  if (!supabaseClient || !userId) throw new Error("Unauthorized");
  const profile = await loadProfile(supabaseClient, userId);
  if (profile?.account_type !== "academic" || !isProfessor(profile.account_subtype)) {
    throw new Error("هذه الصفحة مخصصة للأساتذة فقط");
  }
  return next({ context: { ...context, academicProfile: profile } });
});
