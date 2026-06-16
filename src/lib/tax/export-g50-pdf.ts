import type { G50Result } from "./calculations";
import { buildPrintHtml, escapeHtml, fmtDzd, fmtDzdAr, openPrintDocument } from "@/lib/export-html-pdf";

export function exportG50Pdf(opts: {
  company: Record<string, string | number | null | undefined>;
  result: G50Result;
}) {
  const { company, result } = opts;
  const date = new Date().toLocaleString("ar-DZ");

  const tvaRows = result.tva.lines
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.label)}</td>
      <td>${l.type === "collectee" ? "Collectée" : "Déductible"}</td>
      <td>${(l.rate * 100).toFixed(0)}%</td>
      <td>${fmtDzd(l.baseHt)}</td>
      <td>${fmtDzd(l.tvaAmount)}</td>
    </tr>`,
    )
    .join("");

  const payrollRows = result.payroll.lines
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.employeeName)}</td>
      <td>${escapeHtml(l.matricule ?? "—")}</td>
      <td>${fmtDzd(l.grossSalary)}</td>
      <td>${fmtDzd(l.cnasEmployee)}</td>
      <td>${fmtDzd(l.irg)}</td>
      <td>${fmtDzd(l.netSalary)}</td>
    </tr>`,
    )
    .join("");

  const body = `
  <div class="header-official">
    <h1>الجمهورية الجزائرية الديمقراطية الشعبية</h1>
    <h1 style="font-size:12px;margin-top:4px">République Algérienne Démocratique et Populaire</h1>
    <h2>تصريح G50 الشهري — Déclaration mensuelle G50</h2>
    <div class="meta">
      الفترة / Période: <strong>${result.period.month}/${result.period.year}</strong>
      &nbsp;|&nbsp;
      آجال الإيداع / Échéance: <strong class="ltr">${result.deadline}</strong>
    </div>
  </div>

  <div class="box">
    <p><strong>الاسم القانوني:</strong> ${escapeHtml(String(company.legal_name ?? "—"))}</p>
    <p><strong>الاسم التجاري:</strong> ${escapeHtml(String(company.trade_name ?? "—"))}</p>
    <p>
      <strong>NIF:</strong> <span class="ltr">${escapeHtml(String(company.nif ?? "—"))}</span>
      &nbsp;|&nbsp; <strong>NIS:</strong> <span class="ltr">${escapeHtml(String(company.nis ?? "—"))}</span>
      &nbsp;|&nbsp; <strong>RC:</strong> <span class="ltr">${escapeHtml(String(company.rc ?? "—"))}</span>
      &nbsp;|&nbsp; <strong>AI:</strong> <span class="ltr">${escapeHtml(String(company.ai ?? "—"))}</span>
    </p>
    <p><strong>العنوان:</strong> ${escapeHtml(String(company.address ?? "—"))}</p>
  </div>

  <h3>I. ضريبة القيمة المضافة — TVA</h3>
  <table>
    <thead>
      <tr>
        <th>الوصف</th>
        <th>النوع</th>
        <th>المعدل</th>
        <th>القاعدة HT (DZD)</th>
        <th>مبلغ TVA (DZD)</th>
      </tr>
    </thead>
    <tbody>${tvaRows || '<tr><td colspan="5">—</td></tr>'}</tbody>
  </table>
  <div class="summary-grid">
    <div class="summary-box"><strong>TVA collectée</strong>${fmtDzdAr(result.tva.collectee)}</div>
    <div class="summary-box"><strong>TVA déductible</strong>${fmtDzdAr(result.tva.deductible)}</div>
    <div class="summary-box" style="grid-column:span 2"><strong>TVA nette à payer</strong>${fmtDzdAr(Math.max(0, result.tva.net))}</div>
  </div>

  <h3>II. الأجور — IRG / CNAS</h3>
  <table>
    <thead>
      <tr>
        <th>الموظف</th>
        <th>Matricule</th>
        <th>Brut</th>
        <th>CNAS 9%</th>
        <th>IRG</th>
        <th>Net</th>
      </tr>
    </thead>
    <tbody>${payrollRows || '<tr><td colspan="6">—</td></tr>'}</tbody>
  </table>
  <div class="summary-grid">
    <div class="summary-box"><strong>إجمالي الأجور</strong>${fmtDzdAr(result.payroll.totalGross)}</div>
    <div class="summary-box"><strong>IRG المقتطع</strong>${fmtDzdAr(result.payroll.totalIrg)}</div>
    <div class="summary-box"><strong>CNAS أجير</strong>${fmtDzdAr(result.payroll.totalCnasEmployee)}</div>
    <div class="summary-box"><strong>CNAS صاحب العمل</strong>${fmtDzdAr(result.payroll.totalCnasEmployer)}</div>
  </div>

  <h3>III. TAP — IV. Acompte IBS</h3>
  <div class="summary-grid">
    <div class="summary-box">
      <strong>TAP (${(result.tap.rate * 100).toFixed(1)}%)</strong>
      Base: ${fmtDzd(result.tap.base)} DZD — Montant: ${fmtDzdAr(result.tap.amount)}
    </div>
    <div class="summary-box">
      <strong>IBS acompte (${(result.ibs.rate * 100).toFixed(0)}% — ${result.ibs.regime})</strong>
      ${fmtDzdAr(result.ibs.acompte)}
    </div>
  </div>

  <div class="total">المجموع المستحق للإيداع: ${fmtDzdAr(result.totalDue)}</div>

  <div class="footer">
    <p>تم إنشاء هذا المستند بواسطة AuditNova — ${date}</p>
    <p>الحسابات مبرمجة (Hardcoded Rules) وفق القواعد الضريبية الجزائرية. يُرجى المراجعة قبل الإيداع الرسمي لدى مصالح الضرائب (DGI).</p>
    <p><em>هذا المستند ملخص G50 وليس النموذج الرسمي Jibayatic.</em></p>
  </div>`;

  openPrintDocument(buildPrintHtml({ title: `G50 ${result.period.label}`, body }));
}

export function exportG50Excel(opts: {
  company: Record<string, string | number | null | undefined>;
  result: G50Result;
}) {
  import("xlsx").then((XLSX) => {
    const { company, result } = opts;
    const rows: (string | number)[][] = [
      ["AuditNova — Déclaration G50", result.period.label],
      ["Raison sociale", String(company.legal_name ?? "")],
      ["NIF", String(company.nif ?? "")],
      ["Période", `${result.period.month}/${result.period.year}`],
      ["Échéance", result.deadline],
      [],
      ["Section", "Montant (DZD)"],
      ["TVA collectée", result.tva.collectee],
      ["TVA déductible", result.tva.deductible],
      ["TVA nette", Math.max(0, result.tva.net)],
      ["IRG salaires", result.payroll.totalIrg],
      ["CNAS salarié", result.payroll.totalCnasEmployee],
      ["CNAS employeur", result.payroll.totalCnasEmployer],
      ["TAP", result.tap.amount],
      ["Acompte IBS", result.ibs.acompte],
      ["TOTAL", result.totalDue],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "G50");
    XLSX.writeFile(wb, `G50_${result.period.year}-${String(result.period.month).padStart(2, "0")}.xlsx`);
  });
}
