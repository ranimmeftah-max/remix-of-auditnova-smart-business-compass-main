import { buildPrintHtml, escapeHtml, openPrintDocument } from "@/lib/export-html-pdf";

const CERT_STYLES = `
  @page { size: A4 landscape; margin: 12mm; }
  body { padding: 0; }
  .cert {
    margin: 16px;
    min-height: 180mm;
    border: 3px solid #1e3a5f;
    border-radius: 8px;
    padding: 32px 40px;
    text-align: center;
    background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  }
  .brand { font-size: 18px; font-weight: 700; color: #1e3a5f; margin-bottom: 8px; }
  .title-ar { font-size: 26px; font-weight: 700; margin: 20px 0 8px; color: #111; }
  .title-en { font-size: 16px; color: #555; margin-bottom: 24px; }
  .course { font-size: 22px; font-weight: 700; color: #1e3a5f; margin: 16px 0; padding: 12px; }
  .date { font-size: 13px; color: #444; margin-top: 20px; }
  .code { font-family: monospace; font-size: 11px; color: #666; margin-top: 16px; word-break: break-all; }
  .verify { font-size: 10px; color: #888; margin-top: 4px; direction: ltr; }
`;

export function exportCertificatePdf(opts: {
  courseTitle: string;
  issuedAt: string;
  verificationCode: string;
  verifyUrl: string;
}) {
  const issuedDate = new Date(opts.issuedAt).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = `
  <div class="cert">
    <div class="brand">AuditNova</div>
    <div class="title-ar">شهادة إتمام</div>
    <div class="title-en">Certificate of Completion</div>
    <p>يشهد بأن المتعلّم أتم بنجاح الدورة:</p>
    <div class="course">${escapeHtml(opts.courseTitle)}</div>
    <p class="date">تاريخ الإصدار: ${escapeHtml(issuedDate)}</p>
    <p class="code">رمز التحقق: ${escapeHtml(opts.verificationCode)}</p>
    <p class="verify">${escapeHtml(opts.verifyUrl)}</p>
  </div>`;

  openPrintDocument(
    buildPrintHtml({
      title: `Certificate ${opts.verificationCode}`,
      body,
      extraStyles: CERT_STYLES,
      pageSize: "A4 landscape",
    }),
    { width: 1100, height: 800 },
  );
}
