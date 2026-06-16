import type { G50Input } from "./calculations";

export const MOCK_COMPANY = {
  legal_name: "شركة النجمة للخدمات الرقمية SARL",
  trade_name: "Star Digital",
  nif: "0123456789012345",
  nis: "98765432109876",
  rc: "16/00-1234567B24",
  ai: "16001234567",
  address: "حي الأعمال، الجزائر العاصمة",
  wilaya_code: 16,
  contact_phone: "0550123456",
  contact_email: "contact@stardigital.dz",
};

export const MOCK_G50_INPUT = (): G50Input => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return {
    year,
    month,
    tvaLines: [
      { label: "مبيعات خدمات (19%)", baseHt: 2_500_000, rateKey: "standard", type: "collectee" },
      { label: "مبيعات منتجات (9%)", baseHt: 800_000, rateKey: "reduced", type: "collectee" },
      { label: "مشتريات معدات (19%)", baseHt: 450_000, rateKey: "standard", type: "deductible" },
      { label: "مشتريات مست consumables (19%)", baseHt: 120_000, rateKey: "standard", type: "deductible" },
    ],
    payrollLines: [
      { employeeName: "أحمد بن علي", matricule: "EMP-001", grossSalary: 85_000 },
      { employeeName: "فاطمة مرزوق", matricule: "EMP-002", grossSalary: 72_000 },
      { employeeName: "كريم حمداني", matricule: "EMP-003", grossSalary: 95_000 },
      { employeeName: "سارة بوزيان", matricule: "EMP-004", grossSalary: 68_000 },
    ],
    tapActivity: "services",
    tapBase: 3_300_000,
    ibsRegime: "standard",
    ibsBase: 3_300_000,
    previousIbsAnnual: 858_000,
  };
};

export const MOCK_INVOICE = {
  invoice_number: "FAC-2026-0042",
  invoice_date: new Date().toISOString().slice(0, 10),
  buyer_name: "مؤسسة الأمل للتجارة",
  buyer_nif: "0987654321098765",
  buyer_address: "وهران، حي السلام",
  lines: [
    { description: "تطوير موقع إلكتروني", quantity: 1, unitPrice: 350_000, tvaRateKey: "standard" as const },
    { description: "استضافة سنوية", quantity: 1, unitPrice: 45_000, tvaRateKey: "standard" as const },
    { description: "تدريب فريق (9%)", quantity: 2, unitPrice: 25_000, tvaRateKey: "reduced" as const },
  ],
};

export const MOCK_PAYROLL = {
  period_year: new Date().getFullYear(),
  period_month: new Date().getMonth() + 1,
  employee_name: "أحمد بن علي",
  matricule: "EMP-001",
  gross_salary: 85_000,
  days_worked: 26,
  hire_date: "2022-03-15",
  job_title: "مطور Full-Stack",
};

export const TAX_KNOWLEDGE_SNIPPETS = [
  {
    id: "tva-2024",
    title: "TVA — Loi de finances 2024",
    content:
      "Taux normal 19%, taux réduit 9% (certains produits et services), exonération 0%. TVA nette = TVA collectée − TVA déductible. Déclaration mensuelle G50 avant le 20 du mois suivant.",
  },
  {
    id: "irg-2024",
    title: "IRG sur salaires — Barème mensuel",
    content:
      "Cotisation salarié CNAS 9%. Abattement forfaitaire 40% (plafonné). Barème progressif: 0% jusqu'à 30 000 DZD, 20% de 30 001 à 120 000, 30% de 120 001 à 480 000, 35% au-delà.",
  },
  {
    id: "ibs-2024",
    title: "IBS — Impôt sur les bénéfices des sociétés",
    content:
      "Taux normal 26%. Taux réduit 19% pour activités de production. Acomptes provisionnels mensuels via G50 (1/12 de l'IBS de l'exercice précédent ou base estimée).",
  },
  {
    id: "tap-2024",
    title: "TAP — Taxe sur l'activité professionnelle",
    content: "1,5% pour production de biens, 2% pour prestations de services et autres activités. Base: chiffre d'affaires HT.",
  },
  {
    id: "cnas-2024",
    title: "CNAS — Cotisations sociales",
    content: "Part patronale 26%, part salariale 9% du salaire brut. DAS (Déclaration Annuelle des Salaires) à déposer avant le 31 janvier.",
  },
  {
    id: "g50-deadline",
    title: "Échéance G50",
    content: "Le formulaire G50 (TVA, IRG salaires, TAP, acomptes IBS) doit être déposé et payé au plus tard le 20 de chaque mois pour l'activité du mois précédent.",
  },
] as const;

export const LEGAL_DOCUMENTS_MOCK = [
  {
    id: "legal-tva",
    title: "TVA — Loi de finances 2024",
    category: "TVA",
    year: 2024,
    content: "Taux normal 19%, réduit 9%, exonéré 0%. TVA nette = collectée − déductible. G50 avant le 20.",
  },
  {
    id: "legal-irg",
    title: "IRG salaires — Barème 2024",
    category: "IRG",
    year: 2024,
    content: "CNAS salarié 9%. Abattement 40% plafonné. Barème: 0%, 20%, 30%, 35%.",
  },
  {
    id: "legal-ibs",
    title: "IBS — Taux sociétés",
    category: "IBS",
    year: 2024,
    content: "26% taux normal, 19% production. Acomptes mensuels via G50.",
  },
  {
    id: "legal-tap",
    title: "TAP — Taxe activité professionnelle",
    category: "TAP",
    year: 2024,
    content: "1,5% production, 2% services.",
  },
  {
    id: "legal-cnas",
    title: "CNAS — Cotisations",
    category: "CNAS",
    year: 2024,
    content: "Patronale 26%, salariale 9%. DAS avant 31 janvier.",
  },
  {
    id: "legal-commerce",
    title: "Code de commerce — Dispositions générales",
    category: "Juridique",
    year: null,
    content: "Référence pour facturation, registre commerce, obligations comptables des commerçants.",
  },
  {
    id: "legal-scf",
    title: "SCF — Plan comptable",
    category: "SCF",
    year: null,
    content: "7 classes: capitaux, passif, actif, tiers, financiers, charges, produits.",
  },
] as const;
