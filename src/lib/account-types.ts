export const ACCOUNT_TYPES = ["enterprise", "professional", "academic", "investor"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const SUBTYPES: Record<AccountType, string[]> = {
  enterprise: ["Startup", "SME", "Micro Enterprise"],
  professional: ["Accountant", "Auditor", "Financial Consultant", "Business Mentor"],
  academic: ["Student", "Professor", "Researcher"],
  investor: ["Investor", "Entrepreneur", "Project Holder"],
};

export const SUBSCRIPTION_PLANS = [
  "discovery",
  "student_plus",
  "mentor_pro",
  "startup",
  "incubator",
  "enterprise",
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number];

export function plansForAccount(accountType: AccountType, subtype: string): SubscriptionPlanId[] {
  if (accountType === "academic" && subtype === "Student") return ["discovery", "student_plus"];
  if (accountType === "academic" && subtype === "Professor") return ["mentor_pro"];
  if (accountType === "professional") return ["mentor_pro"];
  if (accountType === "enterprise" && subtype === "Startup") return ["startup", "incubator", "enterprise"];
  if (accountType === "enterprise" && subtype !== "Startup") return ["incubator", "enterprise"];
  if (accountType === "investor") return ["startup", "enterprise"];
  return ["discovery", "student_plus", "mentor_pro", "startup", "incubator", "enterprise"];
}
