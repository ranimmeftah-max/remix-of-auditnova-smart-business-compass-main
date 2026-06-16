import { buildPrintHtml, escapeHtml, fmtDzdArInt, openPrintDocument } from "@/lib/export-html-pdf";

const RECO_LABEL: Record<string, string> = {
  go: "موافق (Go)",
  hold: "انتظار (Hold)",
  no_go: "رفض (No Go)",
  pending: "قيد المراجعة",
};

export function exportOpportunityPdf(opp: {
  company_name: string;
  sector: string | null;
  stage: string | null;
  ticket_size_dzd: number | null;
  valuation_dzd: number | null;
  score_overall: number | null;
  recommendation: string;
  description: string | null;
  notes: string | null;
}) {
  const date = new Date().toLocaleString("ar-DZ");
  const reco = RECO_LABEL[opp.recommendation] ?? opp.recommendation;

  const body = `
  <div class="header-official">
    <h1>تقرير تقييم فرصة استثمار</h1>
    <h2>AuditNova — Investment Opportunity Report</h2>
    <div class="meta">${date}</div>
  </div>

  <div class="box">
    <p><strong>الشركة:</strong> ${escapeHtml(opp.company_name)}</p>
    <p><strong>القطاع:</strong> ${escapeHtml(opp.sector ?? "—")} &nbsp;|&nbsp; <strong>المرحلة:</strong> ${escapeHtml(opp.stage ?? "—")}</p>
    <p><strong>حجم الصفقة:</strong> ${fmtDzdArInt(opp.ticket_size_dzd)} &nbsp;|&nbsp; <strong>التقييم:</strong> ${fmtDzdArInt(opp.valuation_dzd)}</p>
    <p><strong>الدرجة الكلية:</strong> ${opp.score_overall ?? "—"}/100 &nbsp;|&nbsp; <strong>التوصية:</strong> ${escapeHtml(reco)}</p>
  </div>

  <h3>الوصف</h3>
  <div class="box"><p>${escapeHtml(opp.description ?? "—").replace(/\n/g, "<br/>")}</p></div>

  <h3>ملاحظات المستثمر</h3>
  <div class="box"><p>${escapeHtml(opp.notes ?? "—").replace(/\n/g, "<br/>")}</p></div>

  <div class="footer">
    <p>تم الإنشاء بواسطة AuditNova — ${date}</p>
    <p>هذا التقرير ملخص تقييمي وليس توصية استثمارية ملزمة.</p>
  </div>`;

  openPrintDocument(buildPrintHtml({ title: `Opportunité ${opp.company_name}`, body }));
}
