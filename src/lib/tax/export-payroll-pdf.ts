import type { PayrollResult } from "./calculations";
import { buildPrintHtml, escapeHtml, fmtDzd, fmtDzdAr, openPrintDocument } from "@/lib/export-html-pdf";

export function exportPayrollPdf(opts: {
  slip: PayrollResult & {
    period_year: number;
    period_month: number;
    job_title?: string;
    employer_name?: string;
    employer_nif?: string;
    employer_address?: string;
  };
}) {
  const s = opts.slip;
  const date = new Date().toLocaleString("ar-DZ");

  const body = `
  <div class="header-official">
    <h1>الجمهورية الجزائرية الديمقراطية الشعبية</h1>
    <h2>Fiche de paie — كشف الراتب</h2>
    <div class="meta">الفترة: <strong>${s.period_month}/${s.period_year}</strong></div>
  </div>

  <div class="box">
    <p><strong>صاحب العمل:</strong> ${escapeHtml(s.employer_name ?? "—")}</p>
    <p><strong>NIF:</strong> <span class="ltr">${escapeHtml(s.employer_nif ?? "—")}</span></p>
    <p><strong>العنوان:</strong> ${escapeHtml(s.employer_address ?? "—")}</p>
  </div>

  <div class="box">
    <p><strong>الموظف:</strong> ${escapeHtml(s.employeeName)}</p>
    <p><strong>Matricule:</strong> <span class="ltr">${escapeHtml(s.matricule ?? "—")}</span></p>
    <p><strong>المنصب:</strong> ${escapeHtml(s.job_title ?? "—")}</p>
  </div>

  <h3>تفاصيل الراتب</h3>
  <div class="box" style="padding:0;overflow:hidden">
    <div class="amount-row"><span>الراتب الإجمالي (Brut)</span><span>${fmtDzdAr(s.grossSalary)}</span></div>
    <div class="amount-row"><span>CNAS أجير (9%)</span><span>- ${fmtDzdAr(s.cnasEmployee)}</span></div>
    <div class="amount-row"><span>IRG</span><span>- ${fmtDzdAr(s.irg)}</span></div>
    <div class="amount-row"><span>CNAS صاحب العمل (26%)</span><span>${fmtDzdAr(s.cnasEmployer)}</span></div>
    <div class="amount-row"><span>الصافي للدفع (Net)</span><span>${fmtDzdAr(s.netSalary)}</span></div>
  </div>

  <div class="footer">
    <p>تم الإنشاء بواسطة AuditNova — ${date}</p>
    <p>الحسابات مبرمجة وفق قواعد CNAS/IRG الجزائرية. يُرجى المراجعة قبل الاستعمال الرسمي.</p>
  </div>`;

  openPrintDocument(buildPrintHtml({ title: `Paie ${s.period_year}-${s.period_month}`, body }));
}
