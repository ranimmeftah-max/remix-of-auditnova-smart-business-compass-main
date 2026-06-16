export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtDzd(n: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function fmtDzdAr(n: number): string {
  return new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 2 }).format(n);
}

export function fmtDzdArInt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);
}

export const PDF_PRINT_STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Tahoma, "Geeza Pro", Arial, sans-serif;
    color: #111;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    font-size: 12px;
  }
  .header-official {
    text-align: center;
    border: 2px solid #1e3a5f;
    padding: 12px;
    margin-bottom: 16px;
  }
  .header-official h1 { margin: 0; font-size: 14px; font-weight: 700; }
  .header-official h2 { margin: 6px 0 0; font-size: 16px; color: #1e3a5f; }
  .meta { text-align: center; color: #555; font-size: 11px; margin-top: 6px; }
  .box {
    border: 1px solid #ccc;
    padding: 10px 12px;
    margin-bottom: 14px;
    background: #f8fafc;
  }
  .box p { margin: 4px 0; }
  h3 {
    font-size: 13px;
    color: #1e3a5f;
    border-bottom: 2px solid #1e3a5f;
    padding-bottom: 4px;
    margin: 16px 0 8px;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
  th { background: #1e3a5f; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: #f9fafb; }
  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 12px 0;
  }
  .summary-box {
    border: 1px solid #ddd;
    padding: 10px;
    border-radius: 4px;
  }
  .summary-box strong { display: block; color: #1e3a5f; margin-bottom: 4px; }
  .total {
    border: 2px solid #1e3a5f;
    background: #eff6ff;
    padding: 14px;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    margin: 16px 0;
  }
  .footer {
    margin-top: 20px;
    font-size: 10px;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
  .ltr { direction: ltr; text-align: left; display: inline-block; }
  .amount-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  .amount-row:last-child { border-bottom: none; font-weight: 700; background: #eff6ff; }
  @media print { .no-print { display: none !important; } body { padding: 0; } }
  .print-btn {
    position: fixed; top: 12px; left: 12px;
    background: #1e3a5f; color: #fff; border: none;
    padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 14px;
    z-index: 1000;
  }
`;

export function openPrintDocument(html: string, size?: { width?: number; height?: number }) {
  const win = window.open("", "_blank", `width=${size?.width ?? 960},height=${size?.height ?? 1100}`);
  if (!win) {
    alert("الرجاء السماح بالنوافذ المنبثقة لتصدير PDF.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function buildPrintHtml(opts: {
  title: string;
  lang?: string;
  dir?: "rtl" | "ltr";
  extraStyles?: string;
  body: string;
  autoPrint?: boolean;
  pageSize?: string;
}) {
  const lang = opts.lang ?? "ar";
  const dir = opts.dir ?? "rtl";
  const pageRule = opts.pageSize ? `@page { size: ${opts.pageSize}; margin: 14mm; }` : "";
  const autoPrint = opts.autoPrint !== false;
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    ${pageRule}
    ${PDF_PRINT_STYLES}
    ${opts.extraStyles ?? ""}
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">طباعة / حفظ PDF</button>
  ${opts.body}
  ${autoPrint ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 500));</script>' : ""}
</body>
</html>`;
}
