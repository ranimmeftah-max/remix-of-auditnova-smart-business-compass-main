import { z } from "zod";

export const PLAN_YEARS = 5;
export const PAYROLL_LOAD_FACTOR = 1.26;

const yearTuple = z.tuple([
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
]);

export const financialPlanSchema = z.object({
  projectTitle: z.string().max(200),
  depreciationYears: z.number().int().min(1).max(20).default(5),
  variableCosts: z.array(z.object({ id: z.string(), label: z.string().max(120), unitCost: z.number().min(0) })),
  fixedCosts: z.array(z.object({ id: z.string(), label: z.string().max(120), annualAmount: z.number().min(0) })),
  sellingPrice: z.number().min(0),
  expectedAnnualQty: z.number().min(0),
  products: z.array(
    z.object({
      id: z.string(),
      designation: z.string().max(120),
      quantities: yearTuple,
      unitPrice: z.number().min(0),
    }),
  ),
  directCosts: z.array(
    z.object({
      id: z.string(),
      designation: z.string().max(120),
      quantities: yearTuple,
      unitCost: z.number().min(0),
    }),
  ),
  payroll: z.array(
    z.object({
      id: z.string(),
      role: z.string().max(120),
      baseSalaryMonthly: z.number().min(0),
      etp: yearTuple,
    }),
  ),
  externalCharges: z.array(
    z.object({
      id: z.string(),
      label: z.string().max(120),
      amounts: yearTuple,
    }),
  ),
  investments: z.array(
    z.object({
      id: z.string(),
      designation: z.string().max(120),
      functionality: z.string().max(200),
      unitPrice: z.number().min(0),
      amounts: yearTuple,
    }),
  ),
  comments: z.string().max(4000).optional(),
});

export type FinancialPlanInput = z.infer<typeof financialPlanSchema>;

export type YearMetrics = {
  revenue: number;
  directPurchases: number;
  grossMargin: number;
  externalCharges: number;
  payroll: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  netResult: number;
  grossMarginRate: number;
  ebitdaRate: number;
  investment: number;
};

export type BreakEvenMetrics = {
  unitVariableCost: number;
  totalFixedCost: number;
  profitMarginPerUnit: number;
  breakEvenQuantity: number;
  expectedQuantity: number;
  annualRevenue: number;
};

export type FinancialPlanReport = {
  years: YearMetrics[];
  breakEven: BreakEvenMetrics;
  totalInvestment: number;
  totalPayrollY1: number;
  totalExternalY1: number;
  fundingNeedY1: number;
};

export function uid() {
  return crypto.randomUUID();
}

export function emptyFinancialPlan(): FinancialPlanInput {
  return {
    projectTitle: "",
    depreciationYears: 5,
    variableCosts: [{ id: uid(), label: "", unitCost: 0 }],
    fixedCosts: [{ id: uid(), label: "", annualAmount: 0 }],
    sellingPrice: 0,
    expectedAnnualQty: 0,
    products: [{ id: uid(), designation: "", quantities: [0, 0, 0, 0, 0], unitPrice: 0 }],
    directCosts: [{ id: uid(), designation: "", quantities: [0, 0, 0, 0, 0], unitCost: 0 }],
    payroll: [{ id: uid(), role: "", baseSalaryMonthly: 0, etp: [0, 0, 0, 0, 0] }],
    externalCharges: [{ id: uid(), label: "", amounts: [0, 0, 0, 0, 0] }],
    investments: [{ id: uid(), designation: "", functionality: "", unitPrice: 0, amounts: [0, 0, 0, 0, 0] }],
    comments: "",
  };
}

function payrollYear(line: FinancialPlanInput["payroll"][number], yearIndex: number) {
  return line.baseSalaryMonthly * 12 * line.etp[yearIndex] * PAYROLL_LOAD_FACTOR;
}

export function computeFinancialPlan(plan: FinancialPlanInput): FinancialPlanReport {
  const years: YearMetrics[] = [];
  let cumulativeCapex = 0;

  for (let y = 0; y < PLAN_YEARS; y++) {
    const revenue = plan.products.reduce((acc, p) => acc + p.quantities[y] * p.unitPrice, 0);
    const directPurchases = plan.directCosts.reduce((acc, d) => acc + d.quantities[y] * d.unitCost, 0);
    const grossMargin = revenue - directPurchases;
    const externalCharges = plan.externalCharges.reduce((acc, c) => acc + c.amounts[y], 0);
    const payroll = plan.payroll.reduce((acc, p) => acc + payrollYear(p, y), 0);
    const investment = plan.investments.reduce((acc, inv) => acc + inv.amounts[y], 0);
    cumulativeCapex += investment;
    const depreciation = cumulativeCapex / Math.max(plan.depreciationYears, 1);
    const ebitda = grossMargin - externalCharges - payroll;
    const ebit = ebitda - depreciation;
    const netResult = ebit;

    years.push({
      revenue,
      directPurchases,
      grossMargin,
      externalCharges,
      payroll,
      ebitda,
      depreciation,
      ebit,
      netResult,
      grossMarginRate: revenue > 0 ? grossMargin / revenue : 0,
      ebitdaRate: revenue > 0 ? ebitda / revenue : 0,
      investment,
    });
  }

  const unitVariableCost =
    plan.variableCosts.reduce((acc, v) => acc + v.unitCost, 0) ||
    plan.directCosts.reduce((acc, d) => acc + d.unitCost, 0);

  const totalFixedCost =
    plan.fixedCosts.reduce((acc, f) => acc + f.annualAmount, 0) +
    plan.externalCharges.reduce((acc, c) => acc + c.amounts[0], 0) +
    plan.payroll.reduce((acc, p) => acc + payrollYear(p, 0), 0);

  const sellingPrice =
    plan.sellingPrice > 0
      ? plan.sellingPrice
      : plan.products[0]?.unitPrice ?? 0;

  const expectedQuantity =
    plan.expectedAnnualQty > 0
      ? plan.expectedAnnualQty
      : plan.products[0]?.quantities[0] ?? 0;

  const profitMarginPerUnit = sellingPrice - unitVariableCost;
  const breakEvenQuantity =
    profitMarginPerUnit > 0 ? Math.ceil(totalFixedCost / profitMarginPerUnit) : 0;

  const totalInvestment = plan.investments.reduce(
    (acc, inv) => acc + inv.amounts.reduce((s, a) => s + a, 0),
    0,
  );
  const totalPayrollY1 = plan.payroll.reduce((acc, p) => acc + payrollYear(p, 0), 0);
  const totalExternalY1 = plan.externalCharges.reduce((acc, c) => acc + c.amounts[0], 0);
  const investmentY1 = years[0]?.investment ?? 0;

  return {
    years,
    breakEven: {
      unitVariableCost,
      totalFixedCost,
      profitMarginPerUnit,
      breakEvenQuantity,
      expectedQuantity,
      annualRevenue: expectedQuantity * sellingPrice,
    },
    totalInvestment,
    totalPayrollY1,
    totalExternalY1,
    fundingNeedY1: investmentY1 + totalPayrollY1 + totalExternalY1,
  };
}

export function formatDzd(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("fr-DZ")} دج`;
}

export function pct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
