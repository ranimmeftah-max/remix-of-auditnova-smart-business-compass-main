import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getCompany } from "@/lib/enterprise.functions";
import { deleteInvoice, getMockInvoiceData, listInvoices, upsertInvoice } from "@/lib/tax.functions";
import { calcInvoiceTotals, suggestJournalEntry, type InvoiceLineInput } from "@/lib/tax/calculations";
import { exportInvoiceExcel, exportInvoicePdf } from "@/lib/tax/export-invoice-pdf";

export const Route = createFileRoute("/_authenticated/dashboard/invoices")({
  head: () => ({ meta: [{ title: "Factures — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: InvoicesPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);

const emptyLine = (): InvoiceLineInput => ({ description: "", quantity: 1, unitPrice: 0, tvaRateKey: "standard" });

function InvoicesPage() {
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listInvoices);
  const saveFn = useTypedServerFn(upsertInvoice);
  const delFn = useTypedServerFn(deleteInvoice);
  const mockFn = useTypedServerFn(getMockInvoiceData);
  const getCo = useTypedServerFn(getCompany);

  const { data, isLoading } = useQuery({ queryKey: ["tax-invoices"], queryFn: () => listFn() });
  const { data: coData } = useQuery({ queryKey: ["company"], queryFn: () => getCo() });

  const co = coData?.company;
  const [form, setForm] = useState({
    invoice_number: `FAC-${Date.now().toString().slice(-6)}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    buyer_name: "",
    buyer_nif: "",
    buyer_address: "",
    lines: [emptyLine()] as InvoiceLineInput[],
  });

  const totals = calcInvoiceTotals(form.lines.filter((l) => l.description));
  const journal = suggestJournalEntry(totals, true);

  const saveMut = useMutation({
    mutationFn: () => saveFn({
      ...form,
      invoice_type: "sale",
      seller_name: co?.legal_name ?? "—",
      seller_nif: co?.nif ?? null,
      seller_nis: co?.nis ?? null,
      seller_rc: co?.rc ?? null,
      seller_ai: (co as { ai?: string })?.ai ?? null,
      seller_address: co?.address ?? null,
    } as never),
    onSuccess: () => { toast.success("تم حفظ الفاتورة"); qc.invalidateQueries({ queryKey: ["tax-invoices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mockMut = useMutation({
    mutationFn: () => mockFn(),
    onSuccess: (d) => {
      setForm({
        ...form,
        invoice_number: d.mock.invoice_number,
        invoice_date: d.mock.invoice_date,
        buyer_name: d.mock.buyer_name,
        buyer_nif: d.mock.buyer_nif,
        buyer_address: d.mock.buyer_address,
        lines: d.mock.lines,
      });
      toast.success("بيانات تجريبية");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ id }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["tax-invoices"] }); },
  });

  const exportPdf = () => exportInvoicePdf({
    invoiceNumber: form.invoice_number,
    invoiceDate: form.invoice_date,
    seller: { name: co?.legal_name, nif: co?.nif ?? undefined, nis: co?.nis ?? undefined, rc: co?.rc ?? undefined, ai: (co as { ai?: string })?.ai, address: co?.address ?? undefined },
    buyer: { name: form.buyer_name, nif: form.buyer_nif, address: form.buyer_address },
    totals,
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Factures conformes
        </h1>
        <Button variant="outline" onClick={() => mockMut.mutate()}><Sparkles className="h-4 w-4 ml-1" /> تجريبي</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Facture</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>N° Facture</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="mt-1" /></div>
            <div><Label>Date</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="mt-1" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Acheteur</Label><Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} className="mt-1" /></div>
            <div><Label>NIF Acheteur</Label><Input value={form.buyer_nif} onChange={(e) => setForm({ ...form, buyer_nif: e.target.value })} className="mt-1" /></div>
            <div className="md:col-span-2"><Label>Adresse</Label><Input value={form.buyer_address} onChange={(e) => setForm({ ...form, buyer_address: e.target.value })} className="mt-1" /></div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Lignes</Label>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}><Plus className="h-4 w-4" /></Button>
            </div>
            {form.lines.map((line, i) => (
              <div key={i} className="grid md:grid-cols-5 gap-2">
                <Input placeholder="Description" value={line.description} className="md:col-span-2" onChange={(e) => { const n = [...form.lines]; n[i] = { ...line, description: e.target.value }; setForm({ ...form, lines: n }); }} />
                <Input type="number" placeholder="Qté" value={line.quantity || ""} onChange={(e) => { const n = [...form.lines]; n[i] = { ...line, quantity: Number(e.target.value) }; setForm({ ...form, lines: n }); }} />
                <Input type="number" placeholder="PU HT" value={line.unitPrice || ""} onChange={(e) => { const n = [...form.lines]; n[i] = { ...line, unitPrice: Number(e.target.value) }; setForm({ ...form, lines: n }); }} />
                <div className="flex gap-1">
                  <Select value={line.tvaRateKey} onValueChange={(v) => { const n = [...form.lines]; n[i] = { ...line, tvaRateKey: v as InvoiceLineInput["tvaRateKey"] }; setForm({ ...form, lines: n }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="standard">19%</SelectItem><SelectItem value="reduced">9%</SelectItem><SelectItem value="exempt">0%</SelectItem></SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-2 p-3 bg-muted rounded-lg">
            <div>HT: <strong>{fmt(totals.totalHt)}</strong></div>
            <div>TVA: <strong>{fmt(totals.totalTva)}</strong></div>
            <div>TTC: <strong>{fmt(totals.totalTtc)}</strong></div>
          </div>

          <div className="p-3 border rounded-lg text-sm">
            <p className="font-medium mb-2">قيد SCF مقترح:</p>
            {journal.map((j, i) => (
              <p key={i} className="text-muted-foreground">{j.account} — D:{j.debit} C:{j.credit} ({j.label})</p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
            <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 ml-1" /> PDF</Button>
            <Button variant="outline" onClick={() => exportInvoiceExcel({
              invoiceNumber: form.invoice_number, invoiceDate: form.invoice_date,
              seller: { name: co?.legal_name }, buyer: { name: form.buyer_name }, totals,
            })}><FileSpreadsheet className="h-4 w-4 ml-1" /> Excel</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الفواتير المحفوظة</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <div className="space-y-2">
              {(data?.invoices ?? []).map((inv: { id: string; invoice_number: string; buyer_name: string; invoice_date: string; totals: { totalTtc?: number } }) => (
                <div key={inv.id} className="flex justify-between items-center border rounded-lg p-3">
                  <div><p className="font-medium">{inv.invoice_number}</p><p className="text-xs">{inv.buyer_name} — {inv.invoice_date}</p></div>
                  <div className="flex items-center gap-2">
                    <span>{fmt(Number((inv.totals as { totalTtc?: number })?.totalTtc ?? 0))}</span>
                    <Button size="icon" variant="ghost" onClick={() => delMut.mutate(inv.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
