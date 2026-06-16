import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Users, Search, Mail, Phone, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listClients, upsertClient, deleteClient } from "@/lib/professional.functions";

export const Route = createFileRoute("/_authenticated/dashboard/clients")({
  head: () => ({ meta: [{ title: "العملاء — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: ClientsPage,
});

const STATUS = [
  { v: "active", l: "نشط", c: "bg-green-500/10 text-green-700" },
  { v: "prospect", l: "محتمل", c: "bg-blue-500/10 text-blue-700" },
  { v: "inactive", l: "غير نشط", c: "bg-gray-500/10 text-gray-700" },
];

function ClientsPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listClients);
  const save = useTypedServerFn(upsertClient);
  const del = useTypedServerFn(deleteClient);
  const { data, isLoading } = useQuery({ queryKey: ["pro_clients"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>({ status: "active" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = data?.clients ?? [];
    return s ? arr.filter((c: any) => [c.full_name, c.company, c.email, c.phone].join(" ").toLowerCase().includes(s)) : arr;
  }, [data, q]);

  const mut = useMutation({
    mutationFn: () => save({ ...form, wilaya_code: form.wilaya_code ? Number(form.wilaya_code) : null } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ status: "active" }); qc.invalidateQueries({ queryKey: ["pro_clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ id }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["pro_clients"] }); },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Users className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">العملاء</h2><Badge variant="secondary">{data?.clients?.length ?? 0}</Badge></div>
        <Button onClick={() => { setForm({ status: "active" }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />عميل جديد</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute right-3 top-3 text-muted-foreground" />
        <Input placeholder="بحث بالاسم، الشركة، البريد..." value={q} onChange={e => setQ(e.target.value)} className="pr-9" />
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : !filtered.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد عملاء بعد</CardContent></Card>
      : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c: any) => {
          const st = STATUS.find(s => s.v === c.status);
          return <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{c.full_name}</h3>
                  {c.company && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company}</p>}
                </div>
                {st && <Badge className={st.c}>{st.l}</Badge>}
              </div>
              {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
              {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
              {c.sector && <Badge variant="outline" className="text-xs">{c.sector}</Badge>}
              {c.notes && <p className="text-sm line-clamp-2 text-muted-foreground">{c.notes}</p>}
              <div className="flex gap-1 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(c); setOpen(true); }}>تعديل</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف هذا العميل؟")) delMut.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>;
        })}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل عميل" : "إضافة عميل"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>الاسم الكامل *</Label><Input value={form.full_name ?? ""} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشركة</Label><Input value={form.company ?? ""} onChange={e => setForm({ ...form, company: e.target.value })} className="mt-1" /></div>
              <div><Label>القطاع</Label><Input value={form.sector ?? ""} onChange={e => setForm({ ...form, sector: e.target.value })} className="mt-1" /></div>
              <div><Label>البريد</Label><Input type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
              <div><Label>الهاتف</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <div><Label>الولاية (رقم)</Label><Input type="number" value={form.wilaya_code ?? ""} onChange={e => setForm({ ...form, wilaya_code: e.target.value })} className="mt-1" /></div>
              <div><Label>الحالة</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
