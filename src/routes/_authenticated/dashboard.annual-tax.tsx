import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { calcAnnualTax } from "@/lib/tax.functions";

export const Route = createFileRoute("/_authenticated/dashboard/annual-tax")({
  head: () => ({ meta: [{ title: "Bilan fiscal — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: AnnualTaxPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);

function AnnualTaxPage() {
  const calcFn = useTypedServerFn(calcAnnualTax);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [ibsRegime, setIbsRegime] = useState<"standard" | "production">("standard");
  const [tapActivity, setTapActivity] = useState<"production" | "services">("services");
  const [result, setResult] = useState<{ profit: number; ibs: number; tap: number } | null>(null);

  const mut = useMutation({
    mutationFn: () => calcFn({ revenue, expenses, ibsRegime, tapActivity }),
    onSuccess: (d) => setResult(d),
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Scale className="h-7 w-7 text-primary" /> Bilan fiscal annuel (G4 / IBS / TAP)
      </h1>

      <Card>
        <CardHeader><CardTitle>Données annuelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Chiffre d'affaires HT</Label><Input type="number" value={revenue || ""} onChange={(e) => setRevenue(Number(e.target.value))} className="mt-1" /></div>
          <div><Label>Charges déductibles</Label><Input type="number" value={expenses || ""} onChange={(e) => setExpenses(Number(e.target.value))} className="mt-1" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Régime IBS</Label>
              <Select value={ibsRegime} onValueChange={(v) => setIbsRegime(v as typeof ibsRegime)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="standard">26%</SelectItem><SelectItem value="production">19%</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Activité TAP</Label>
              <Select value={tapActivity} onValueChange={(v) => setTapActivity(v as typeof tapActivity)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="production">1.5%</SelectItem><SelectItem value="services">2%</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mut.mutate()}><Calculator className="h-4 w-4 ml-1" /> Calculer</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 grid sm:grid-cols-3 gap-4">
            <div><p className="text-sm text-muted-foreground">Résultat imposable</p><p className="text-xl font-bold">{fmt(result.profit)}</p></div>
            <div><p className="text-sm text-muted-foreground">IBS annuel</p><p className="text-xl font-bold">{fmt(result.ibs)}</p></div>
            <div><p className="text-sm text-muted-foreground">TAP annuel</p><p className="text-xl font-bold">{fmt(result.tap)}</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
