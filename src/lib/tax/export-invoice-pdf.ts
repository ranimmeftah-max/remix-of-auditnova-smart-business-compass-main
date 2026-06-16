import type { InvoiceTotals } from "./calculations";
import { buildPrintHtml, escapeHtml, fmtDzd, fmtDzdAr, openPrintDocument } from "@/lib/export-html-pdf";

export function exportInvoicePdf(opts: {
  invoiceNumber: string;
  invoiceDate: string;
  seller: Record<string, string | undefined>;
  buyer: Record<string, string | undefined>;
  totals: InvoiceTotals;
}) {
  const date = new Date().toLocaleString("ar-DZ");

  const lineRows = opts.totals.lines
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.description)}</td>
      <td>${l.quantity}</td>
      <td>${fmtDzd(l.unitPrice)}</td>
      <td>${(l.rate * 100).toFixed(0)}%</td>
      <td>${fmtDzd(l.ht)}</td>
      <td>${fmtDzd(l.tva)}</td>
      <td>${fmtDzd(l.ttc)}</td>
    </tr>`,
    )
    .join("");

  const body = `
  <div class="header-official">
    <h1>الجمهورية الجزائرية الديمقراطية الشعبية</h1>
    <h2>فاتورة — Facture</h2>
    <div class="meta">
      N° <span class="ltr">${escapeHtml(opts.invoiceNumber)}</span>
      &nbsp;|&nbsp; التاريخ: <span class="ltr">${escapeHtml(opts.invoiceDate)}</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="box">
      <p><strong>البائع / Vendeur</strong></p>
      <p>${escapeHtml(opts.seller.name ?? "—")}</p>
      <p>NIF: <span class="ltr">${escapeHtml(opts.seller.nif ?? "—")}</span></p>
      <p>NIS: <span class="ltr">${escapeHtml(opts.seller.nis ?? "—")}</span></p>
      <p>RC: <span class="ltr">${escapeHtml(opts.seller.rc ?? "—")}</span></p>
      <p>AI: <span class="ltr">${escapeHtml(opts.seller.ai ?? "—")}</span></p>
      <p>${escapeHtml(opts.seller.address ?? "")}</p>
    </div>
    <div class="box">
      <p><strong>المشتري / Acheteur</strong></p>
      <p>${escapeHtml(opts.buyer.name ?? "—")}</p>
      <p>NIF: <span class="ltr">${escapeHtml(opts.buyer.nif ?? "—")}</span></p>
      <p>${escapeHtml(opts.buyer.address ?? "")}</p>
    </div>
  </div>

  <h3>تفاصيل الفاتورة</h3>
  <table>
    <thead>
      <tr>
        <th>الوصف</th>
        <th>الكمية</th>
        <th>PU HT</th>
        <th>TVA</th>
        <th>HT</th>
        <th>TVA</th>
        <th>TTC</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="summary-grid">
    <div class="summary-box"><strong>Total HT</strong>${fmtDzdAr(opts.totals.totalHt)}</div>
    <div class="summary-box"><strong>Total TVA</strong>${fmtDzdAr(opts.totals.totalTva)}</div>
    <div class="summary-box" style="grid-column:span 2"><strong>Total TTC</strong>${fmtDzdAr(opts.totals.totalTtc)}</div>
  </div>

  <div class="footer">
    <p>تم الإنشاء بواسطة AuditNova — ${date}</p>
    <p>فاتورة مطابقة للمعايير الجزائرية (NIF, NIS, RC, AI).</p>
  </div>`;

  openPrintDocument(buildPrintHtml({ title: `Facture ${opts.invoiceNumber}`, body }));
}

export function exportInvoiceExcel(opts: {
  invoiceNumber: string;
  invoiceDate: string;
  seller: Record<string, string | undefined>;
  buyer: Record<string, string | undefined>;
  totals: InvoiceTotals;
}) {
  import("xlsx").then((XLSX) => {
    const rows: (string | number)[][] = [
      ["Facture", opts.invoiceNumber],
      ["Date", opts.invoiceDate],
      ["Vendeur", opts.seller.name ?? ""],
      ["NIF", opts.seller.nif ?? ""],
      [],
      ["Description", "Quantite", "PU HT", "TVA %", "HT", "TVA", "TTC"],
    ];
    for (const l of opts.totals.lines) {
      rows.push([l.description, l.quantity, l.unitPrice, l.rate * 100, l.ht, l.tva, l.ttc]);
    }
    rows.push([], ["Total HT", opts.totals.totalHt], ["Total TVA", opts.totals.totalTva], ["Total TTC", opts.totals.totalTtc]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facture");
    XLSX.writeFile(wb, `Facture_${opts.invoiceNumber}.xlsx`);
  });
}
