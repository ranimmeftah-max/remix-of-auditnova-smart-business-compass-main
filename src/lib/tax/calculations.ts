import {
  CNAS_EMPLOYEE_RATE,
  CNAS_EMPLOYER_RATE,
  G50_DEADLINE_DAY,
  IBS_RATES,
  IRG_ABATTEMENT_MONTHLY_CAP,
  IRG_ABATTEMENT_RATE,
  IRG_MONTHLY_BRACKETS,
  TAP_RATES,
  TVA_RATES,
  type IbsRegime,
  type TapActivity,
  type TvaRateKey,
} from "./constants";

export type TvaLineInput = {
  label: string;
  baseHt: number;
  rateKey: TvaRateKey;
  type: "collectee" | "deductible";
};

export type TvaLineResult = TvaLineInput & {
  rate: number;
  tvaAmount: number;
};

export type PayrollInput = {
  employeeName: string;
  matricule?: string;
  grossSalary: number;
  daysWorked?: number;
};

export type PayrollResult = PayrollInput & {
  cnasEmployee: number;
  cnasEmployer: number;
  irg: number;
  netSalary: number;
  taxableBase: number;
};

export type G50Input = {
  year: number;
  month: number;
  tvaLines: TvaLineInput[];
  payrollLines: PayrollInput[];
  tapActivity: TapActivity;
  tapBase: number;
  ibsRegime: IbsRegime;
  ibsBase: number;
  previousIbsAnnual?: number;
};

export type G50Result = {
  period: { year: number; month: number; label: string };
  deadline: string;
  tva: {
    collectee: number;
    deductible: number;
    net: number;
    lines: TvaLineResult[];
  };
  payroll: {
    totalGross: number;
    totalCnasEmployee: number;
    totalCnasEmployer: number;
    totalIrg: number;
    totalNet: number;
    lines: PayrollResult[];
  };
  tap: { base: number; rate: number; amount: number };
  ibs: { base: number; rate: number; acompte: number; regime: IbsRegime };
  totalDue: number;
};

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRateKey: TvaRateKey;
};

export type InvoiceTotals = {
  lines: Array<InvoiceLineInput & { ht: number; tva: number; ttc: number; rate: number }>;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
};

export function roundDzd(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcTvaLine(line: TvaLineInput): TvaLineResult {
  const rate = TVA_RATES[line.rateKey];
  return {
    ...line,
    rate,
    tvaAmount: roundDzd(line.baseHt * rate),
  };
}

export function calcTvaSummary(lines: TvaLineInput[]) {
  const computed = lines.map(calcTvaLine);
  const collectee = roundDzd(
    computed.filter((l) => l.type === "collectee").reduce((s, l) => s + l.tvaAmount, 0),
  );
  const deductible = roundDzd(
    computed.filter((l) => l.type === "deductible").reduce((s, l) => s + l.tvaAmount, 0),
  );
  return { lines: computed, collectee, deductible, net: roundDzd(collectee - deductible) };
}

export function calcIrgMonthly(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  const cnasEmployee = roundDzd(grossSalary * CNAS_EMPLOYEE_RATE);
  let base = grossSalary - cnasEmployee;
  const abattement = Math.min(roundDzd(base * IRG_ABATTEMENT_RATE), IRG_ABATTEMENT_MONTHLY_CAP);
  base = Math.max(0, base - abattement);

  let irg = 0;
  for (const bracket of IRG_MONTHLY_BRACKETS) {
    if (base <= bracket.min) continue;
    const upper = bracket.max === Infinity ? base : Math.min(base, bracket.max);
    const taxable = upper - bracket.min;
    if (taxable > 0) irg += taxable * bracket.rate;
  }
  return roundDzd(Math.max(0, irg));
}

export function calcPayrollLine(input: PayrollInput): PayrollResult {
  const grossSalary = roundDzd(input.grossSalary);
  const cnasEmployee = roundDzd(grossSalary * CNAS_EMPLOYEE_RATE);
  const cnasEmployer = roundDzd(grossSalary * CNAS_EMPLOYER_RATE);
  const taxableBase = roundDzd(grossSalary - cnasEmployee);
  const irg = calcIrgMonthly(grossSalary);
  const netSalary = roundDzd(grossSalary - cnasEmployee - irg);
  return {
    ...input,
    grossSalary,
    cnasEmployee,
    cnasEmployer,
    irg,
    netSalary,
    taxableBase,
  };
}

export function calcTap(base: number, activity: TapActivity) {
  const rate = TAP_RATES[activity];
  return { base: roundDzd(base), rate, amount: roundDzd(base * rate) };
}

export function calcIbsAcompte(base: number, regime: IbsRegime, previousIbsAnnual?: number) {
  const rate = IBS_RATES[regime];
  if (previousIbsAnnual && previousIbsAnnual > 0) {
    return { base, rate, acompte: roundDzd(previousIbsAnnual / 12), regime };
  }
  return { base: roundDzd(base), rate, acompte: roundDzd((base * rate) / 12), regime };
}

export function g50Deadline(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const d = new Date(nextYear, nextMonth - 1, G50_DEADLINE_DAY);
  return d.toISOString().slice(0, 10);
}

export function sanitizeG50Lines(input: Pick<G50Input, "tvaLines" | "payrollLines">) {
  return {
    tvaLines: input.tvaLines.filter((l) => l.label.trim().length > 0 || l.baseHt > 0),
    payrollLines: input.payrollLines
      .filter((l) => l.employeeName.trim().length > 0)
      .map((l) => ({ ...l, employeeName: l.employeeName.trim() })),
  };
}

export function calcG50(input: G50Input): G50Result {
  const cleaned = sanitizeG50Lines(input);
  const tva = calcTvaSummary(cleaned.tvaLines);
  const payrollLines = cleaned.payrollLines.map(calcPayrollLine);
  const payroll = {
    lines: payrollLines,
    totalGross: roundDzd(payrollLines.reduce((s, l) => s + l.grossSalary, 0)),
    totalCnasEmployee: roundDzd(payrollLines.reduce((s, l) => s + l.cnasEmployee, 0)),
    totalCnasEmployer: roundDzd(payrollLines.reduce((s, l) => s + l.cnasEmployer, 0)),
    totalIrg: roundDzd(payrollLines.reduce((s, l) => s + l.irg, 0)),
    totalNet: roundDzd(payrollLines.reduce((s, l) => s + l.netSalary, 0)),
  };
  const tap = calcTap(input.tapBase, input.tapActivity);
  const ibs = calcIbsAcompte(input.ibsBase, input.ibsRegime, input.previousIbsAnnual);
  const totalDue = roundDzd(
    Math.max(0, tva.net) + payroll.totalIrg + tap.amount + ibs.acompte,
  );
  const monthLabel = `${input.year}-${String(input.month).padStart(2, "0")}`;
  return {
    period: { year: input.year, month: input.month, label: monthLabel },
    deadline: g50Deadline(input.year, input.month),
    tva,
    payroll,
    tap,
    ibs,
    totalDue,
  };
}

export function calcInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
  const computed = lines.map((line) => {
    const rate = TVA_RATES[line.tvaRateKey];
    const ht = roundDzd(line.quantity * line.unitPrice);
    const tva = roundDzd(ht * rate);
    return { ...line, ht, tva, ttc: roundDzd(ht + tva), rate };
  });
  return {
    lines: computed,
    totalHt: roundDzd(computed.reduce((s, l) => s + l.ht, 0)),
    totalTva: roundDzd(computed.reduce((s, l) => s + l.tva, 0)),
    totalTtc: roundDzd(computed.reduce((s, l) => s + l.ttc, 0)),
  };
}

export function suggestJournalEntry(invoice: InvoiceTotals, isSale: boolean) {
  if (isSale) {
    return [
      { account: "411", debit: invoice.totalTtc, credit: 0, label: "Client" },
      { account: "701", debit: 0, credit: invoice.totalHt, label: "Vente" },
      { account: "445", debit: 0, credit: invoice.totalTva, label: "TVA collectée" },
    ];
  }
  return [
    { account: "607", debit: invoice.totalHt, credit: 0, label: "Achat" },
    { account: "445", debit: invoice.totalTva, credit: 0, label: "TVA déductible" },
    { account: "401", debit: 0, credit: invoice.totalTtc, label: "Fournisseur" },
  ];
}
