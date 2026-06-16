import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2, Plus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  getScfBalance, initScfAccounts, listJournalEntries, listScfAccounts, upsertJournalEntry,
} from "@/lib/tax.functions";

export const Route = createFileRoute("/_authenticated/dashboard/scf")({
  head: () => ({ meta: [{ title: "SCF — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: ScfPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { minimumFractionDigits: 2 }).format(n);

function ScfPage() {
  const qc = useQueryClient();
  const initFn = useTypedServerFn(initScfAccounts);
  const accFn = useTypedServerFn(listScfAccounts);
  const entriesFn = useTypedServerFn(listJournalEntries);
  const balanceFn = useTypedServerFn(getScfBalance);
  const saveEntryFn = useTypedServerFn(upsertJournalEntry);

  const initMut = useMutation({ mutationFn: () => initFn(), onSuccess: () => { qc.invalidateQueries({ queryKey: ["scf-accounts"] }); toast.success("تم تهيئة plan comptable"); } });
  const { data: accData, isLoading: accLoading } = useQuery({ queryKey: ["scf-accounts"], queryFn: () => accFn() });
  const { data: entriesData } = useQuery({ queryKey: ["scf-entries"], queryFn: () => entriesFn() });
  const { data: balanceData } = useQuery({ queryKey: ["scf-balance"], queryFn: () => balanceFn() });

  useEffect(() => {
    if (!accLoading && (accData?.accounts?.length ?? 0) === 0) initMut.mutate();
  }, [accLoading, accData?.accounts?.length]);

  const [entry, setEntry] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
    lines: [
      { account_code: "411", label: "Client", debit: 0, credit: 0 },
      { account_code: "701", label: "Vente", debit: 0, credit: 0 },
    ],
  });

  const saveMut = useMutation({
    mutationFn: () => saveEntryFn(entry as never),
    onSuccess: () => {
      toast.success("تم تسجيل القيد");
      qc.invalidateQueries({ queryKey: ["scf-entries"] });
      qc.invalidateQueries({ queryKey: ["scf-balance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-7 w-7 text-primary" /> المحاسبة SCF
      </h1>

      <Card>
        <CardHeader><CardTitle>Plan comptable ({accData?.accounts?.length ?? 0} comptes)</CardTitle></CardHeader>
        <CardContent className="max-h-48 overflow-auto text-sm space-y-1">
          {(accData?.accounts ?? []).map((a: { code: string; label: string; class_num: number }) => (
            <div key={a.code} className="flex justify-between border-b py-1">
              <span>{a.code} — {a.label}</span>
              <span className="text-muted-foreground">Classe {a.class_num}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قيد يومية جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>Date</Label><Input type="date" value={entry.entry_date} onChange={(e) => setEntry({ ...entry, entry_date: e.target.value })} className="mt-1" /></div>
            <div><Label>Référence</Label><Input value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} className="mt-1" /></div>
            <div><Label>Description</Label><Input value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} className="mt-1" /></div>
          </div>
          {entry.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <Input placeholder="Compte" value={l.account_code} onChange={(e) => { const n = [...entry.lines]; n[i] = { ...l, account_code: e.target.value }; setEntry({ ...entry, lines: n }); }} />
              <Input placeholder="Libellé" value={l.label ?? ""} onChange={(e) => { const n = [...entry.lines]; n[i] = { ...l, label: e.target.value }; setEntry({ ...entry, lines: n }); }} />
              <Input type="number" placeholder="Débit" value={l.debit || ""} onChange={(e) => { const n = [...entry.lines]; n[i] = { ...l, debit: Number(e.target.value) }; setEntry({ ...entry, lines: n }); }} />
              <Input type="number" placeholder="Crédit" value={l.credit || ""} onChange={(e) => { const n = [...entry.lines]; n[i] = { ...l, credit: Number(e.target.value) }; setEntry({ ...entry, lines: n }); }} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEntry({ ...entry, lines: [...entry.lines, { account_code: "", label: "", debit: 0, credit: 0 }] })}><Plus className="h-4 w-4" /></Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="h-4 w-4 ml-1" /> Enregistrer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {(balanceData?.balance ?? []).length === 0 ? <p className="text-muted-foreground">لا توجد قيود بعد.</p> : (
            balanceData?.balance.map((b: { account_code: string; debit: number; credit: number; balance: number }) => (
              <div key={b.account_code} className="flex justify-between border-b py-1">
                <span>{b.account_code}</span>
                <span>D:{fmt(b.debit)} C:{fmt(b.credit)} Solde:{fmt(b.balance)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Journal</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(entriesData?.entries ?? []).map((e: { id: string; entry_date: string; description: string; reference: string | null }) => (
            <div key={e.id} className="border rounded-lg p-3 text-sm">
              <p className="font-medium">{e.entry_date} — {e.description}</p>
              {e.reference && <p className="text-muted-foreground">Ref: {e.reference}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
