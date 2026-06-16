import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { getCompany, upsertCompany } from "@/lib/enterprise.functions";

export const Route = createFileRoute("/_authenticated/dashboard/company")({
  head: () => ({ meta: [{ title: "بطاقة المؤسسة — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: CompanyPage,
});

type Form = Record<string, string>;
const FIELDS: Array<{ k: string; label: string; type?: string; full?: boolean }> = [
  { k: "legal_name", label: "الاسم القانوني *" },
  { k: "trade_name", label: "الاسم التجاري" },
  { k: "nif", label: "NIF" },
  { k: "nis", label: "NIS" },
  { k: "rc", label: "السجل التجاري" },
  { k: "ai", label: "Article d'impôt (AI)" },
  { k: "sector", label: "القطاع" },
  { k: "stage", label: "المرحلة" },
  { k: "founded_year", label: "سنة التأسيس", type: "number" },
  { k: "employees_count", label: "عدد الموظفين", type: "number" },
  { k: "wilaya_code", label: "رمز الولاية", type: "number" },
  { k: "website", label: "الموقع الإلكتروني" },
  { k: "contact_email", label: "بريد التواصل", type: "email" },
  { k: "contact_phone", label: "هاتف التواصل" },
  { k: "logo_url", label: "رابط الشعار" },
  { k: "address", label: "العنوان", full: true },
];

function CompanyPage() {
  const qc = useQueryClient();
  const get = useTypedServerFn(getCompany);
  const save = useTypedServerFn(upsertCompany);
  const { data, isLoading } = useQuery({ queryKey: ["company"], queryFn: () => get() });
  const [form, setForm] = useState<Form>({});

  useEffect(() => {
    if (data?.company) {
      const f: Form = {};
      for (const k of Object.keys(data.company)) {
        const v = (data.company as Record<string, unknown>)[k];
        f[k] = v == null ? "" : String(v);
      }
      setForm(f);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { legal_name: form.legal_name?.trim() };
      for (const f of FIELDS) {
        if (f.k === "legal_name") continue;
        const v = form[f.k];
        if (v === undefined || v === "") { payload[f.k] = null; continue; }
        payload[f.k] = f.type === "number" ? Number(v) : v;
      }
      payload.description = form.description ?? null;
      return save(payload as never);
    },
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["company"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">بطاقة المؤسسة</h2>
      </div>
      <Card>
        <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
              {FIELDS.map((f) => (
                <div key={f.k} className={f.full ? "md:col-span-2" : ""}>
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type ?? "text"}
                    value={form[f.k] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="mt-1"
                    required={f.k === "legal_name"}
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label>وصف الشركة</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={4} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={mut.isPending}>
                  {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
