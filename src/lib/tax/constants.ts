export const TVA_RATES = {
  standard: 0.19,
  reduced: 0.09,
  exempt: 0,
} as const;

export type TvaRateKey = keyof typeof TVA_RATES;

export const CNAS_EMPLOYER_RATE = 0.26;
export const CNAS_EMPLOYEE_RATE = 0.09;

export const TAP_RATES = {
  production: 0.015,
  services: 0.02,
} as const;

export type TapActivity = keyof typeof TAP_RATES;

export const IBS_RATES = {
  standard: 0.26,
  production: 0.19,
} as const;

export type IbsRegime = keyof typeof IBS_RATES;

export const IRG_ABATTEMENT_RATE = 0.4;
export const IRG_ABATTEMENT_MONTHLY_CAP = 1500;

export const IRG_MONTHLY_BRACKETS = [
  { min: 0, max: 30_000, rate: 0 },
  { min: 30_001, max: 120_000, rate: 0.2 },
  { min: 120_001, max: 480_000, rate: 0.3 },
  { min: 480_001, max: Infinity, rate: 0.35 },
] as const;

export const G50_DEADLINE_DAY = 20;

export const SCF_ACCOUNT_CLASSES = [
  { class: 1, labelAr: "حسابات رأس المال", labelFr: "Comptes de capitaux" },
  { class: 2, labelAr: "حسابات الالتزامات", labelFr: "Comptes de passif" },
  { class: 3, labelAr: "حسابات الأصول", labelFr: "Comptes d'actif" },
  { class: 4, labelAr: "حسابات الطرف الثالث", labelFr: "Comptes de tiers" },
  { class: 5, labelAr: "حسابات المالية", labelFr: "Comptes financiers" },
  { class: 6, labelAr: "حسابات المصاريف", labelFr: "Comptes de charges" },
  { class: 7, labelAr: "حسابات الإيرادات", labelFr: "Comptes de produits" },
] as const;

export const SCF_DEFAULT_ACCOUNTS = [
  { code: "101", label: "Capital social", class: 1 },
  { code: "401", label: "Fournisseurs", class: 4 },
  { code: "411", label: "Clients", class: 4 },
  { code: "421", label: "Personnel - Rémunérations dues", class: 4 },
  { code: "431", label: "Sécurité sociale (CNAS)", class: 4 },
  { code: "445", label: "État - TVA à payer", class: 4 },
  { code: "512", label: "Banque", class: 5 },
  { code: "531", label: "Caisse", class: 5 },
  { code: "601", label: "Achats de marchandises", class: 6 },
  { code: "607", label: "Achats de marchandises (TVA)", class: 6 },
  { code: "641", label: "Rémunérations du personnel", class: 6 },
  { code: "645", label: "Charges de sécurité sociale", class: 6 },
  { code: "701", label: "Ventes de marchandises", class: 7 },
  { code: "707", label: "Ventes de marchandises (TVA)", class: 7 },
] as const;
