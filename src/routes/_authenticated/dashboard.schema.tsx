import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Database, Download, FileText, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildPrintHtml, openPrintDocument } from "@/lib/export-html-pdf";

export const Route = createFileRoute("/_authenticated/dashboard/schema")({
  head: () => ({ meta: [{ title: "مخطط قاعدة البيانات — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: SchemaPage,
});

const ERD = `erDiagram
  profiles ||--o{ user_roles : "has"
  profiles ||--o{ subscriptions : "has"
  profiles ||--o{ companies : "owns"
  profiles ||--o{ company_listings : "publishes"
  profiles ||--o{ investment_opportunities : "creates"
  profiles ||--o{ notifications : "receives"
  profiles ||--o{ direct_messages : "sends"
  profiles ||--o{ chat_threads : "owns"
  profiles ||--o{ pro_clients : "manages"
  wilayas ||--o{ profiles : "locates"

  companies ||--o{ financial_periods : "reports"
  companies ||--o{ risk_items : "tracks"
  companies ||--o{ audit_reports : "audits"
  companies ||--o{ investment_rounds : "raises"

  chat_threads ||--o{ chat_messages : "contains"
  chat_messages ||--o{ message_feedback : "rates"

  pro_clients ||--o{ pro_engagements : "engages"
  pro_clients ||--o{ pro_analyses : "analyzed_in"
  pro_clients ||--o{ pro_compliance_checks : "checked_in"
  pro_clients ||--o{ pro_appointments : "books"

  profiles {
    uuid id PK
    text email
    text phone
    int wilaya_code FK
    enum account_type
    text locale
    timestamptz last_seen_at
  }
  user_roles { uuid id PK uuid user_id FK enum role }
  subscriptions { uuid id PK uuid user_id FK text plan text status }
  wilayas { int code PK text name_ar text name_fr }
  companies {
    uuid id PK
    uuid owner_id FK
    text legal_name
    text nif
    text sector
    int wilaya_code
  }
  financial_periods {
    uuid id PK
    uuid company_id FK
    text period_label
    numeric revenue_dzd
    numeric ebitda_dzd
    numeric net_income_dzd
  }
  risk_items { uuid id PK uuid company_id FK text title text severity text status }
  audit_reports { uuid id PK uuid company_id FK text title int score }
  investment_rounds { uuid id PK uuid company_id FK text round_name numeric target_amount numeric raised_amount }
  company_listings { uuid id PK uuid owner_id FK text title numeric asking_price text status }
  investment_opportunities { uuid id PK uuid owner_id FK text title numeric score_overall }
  notifications { uuid id PK uuid user_id FK text type text title timestamptz read_at }
  direct_messages { uuid id PK uuid sender_id FK uuid recipient_id FK text body timestamptz read_at }
  chat_threads { uuid id PK uuid user_id FK text title }
  chat_messages { uuid id PK uuid thread_id FK text role text content }
  message_feedback { uuid id PK uuid message_id FK int rating }
  pro_clients { uuid id PK uuid owner_id FK text full_name text company text status }
  pro_engagements { uuid id PK uuid client_id FK text title numeric fee int progress }
  pro_analyses { uuid id PK uuid client_id FK text title int score }
  pro_compliance_checks { uuid id PK uuid client_id FK text framework text status }
  pro_appointments { uuid id PK uuid client_id FK text title timestamptz scheduled_at }
`;

const GROUPS = [
  { label: "الهوية", color: "bg-blue-500/10 text-blue-700", tables: ["profiles", "user_roles", "subscriptions", "wilayas"] },
  { label: "المؤسسات", color: "bg-green-500/10 text-green-700", tables: ["companies", "financial_periods", "risk_items", "audit_reports", "investment_rounds"] },
  { label: "السوق", color: "bg-amber-500/10 text-amber-700", tables: ["company_listings", "investment_opportunities"] },
  { label: "التواصل", color: "bg-purple-500/10 text-purple-700", tables: ["notifications", "direct_messages", "chat_threads", "chat_messages", "message_feedback"] },
  { label: "الاحترافي", color: "bg-rose-500/10 text-rose-700", tables: ["pro_clients", "pro_engagements", "pro_analyses", "pro_compliance_checks", "pro_appointments"] },
];

function SchemaPage() {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const isDark = document.documentElement.classList.contains("dark");
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      er: { useMaxWidth: false },
    });
    mermaid
      .render("erd-graph", ERD)
      .then(({ svg }) => { if (mounted) setSvg(svg); })
      .catch((e) => { if (mounted) setErr(String(e?.message ?? e)); });
    return () => { mounted = false; };
  }, []);

  const download = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "database-erd.svg"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!svg) return;
    const date = new Date().toLocaleString("ar-DZ");
    const groupsHtml = GROUPS.map(
      (g) => `<div class="group"><span class="badge">${g.label}</span> ${g.tables.map((t) => `<code>${t}</code>`).join(" ")}</div>`,
    ).join("");
    const SCHEMA_STYLES = `
      header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 14px; }
      h1 { margin: 0; font-size: 20px; }
      h2 { font-size: 14px; color: #2563eb; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
      .group { margin: 6px 0; font-size: 12px; }
      .badge { background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 11px; margin-inline-end: 6px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin: 2px; display: inline-block; }
      .diagram { width: 100%; text-align: center; margin-top: 12px; page-break-inside: avoid; }
      .diagram svg { max-width: 100%; height: auto; }
      footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px; }
    `;
    const body = `
      <header><h1>مخطط قاعدة البيانات (ERD) — AuditNova</h1><div class="meta">تم التصدير في ${date}</div></header>
      <h2>مجموعات الجداول</h2>${groupsHtml}
      <h2>المخطط البياني للعلاقات</h2>
      <div class="diagram" dir="ltr">${svg}</div>
      <footer>© ${new Date().getFullYear()} AuditNova</footer>`;
    openPrintDocument(
      buildPrintHtml({ title: "مخطط قاعدة البيانات — AuditNova", body, extraStyles: SCHEMA_STYLES, pageSize: "A3 landscape" }),
      { width: 1200, height: 900 },
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">مخطط قاعدة البيانات (ERD)</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={download} disabled={!svg}><Download className="h-4 w-4 ml-2" />SVG</Button>
          <Button onClick={exportPdf} disabled={!svg}><FileText className="h-4 w-4 ml-2" />تصدير PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مجموعات الجداول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GROUPS.map((g) => (
            <div key={g.label} className="flex flex-wrap items-center gap-2">
              <Badge className={g.color + " font-semibold"}>{g.label}</Badge>
              {g.tables.map((t) => (
                <Badge key={t} variant="outline" className="font-mono text-xs">{t}</Badge>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {err ? (
            <p className="text-destructive text-sm">تعذّر عرض المخطط: {err}</p>
          ) : !svg ? (
            <p className="text-muted-foreground text-sm text-center py-8">جارٍ توليد المخطط...</p>
          ) : (
            <div className="overflow-auto border rounded-lg bg-background" style={{ maxHeight: "75vh" }}>
              <div
                ref={ref}
                dir="ltr"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "inline-block", padding: "1rem" }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
