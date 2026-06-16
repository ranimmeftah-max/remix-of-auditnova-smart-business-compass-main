import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Calendar as CalIcon, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { listAppointments, upsertAppointment, deleteAppointment, listClients } from "@/lib/professional.functions";

export const Route = createFileRoute("/_authenticated/dashboard/appointments")({
  head: () => ({ meta: [{ title: "المواعيد — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: AppointmentsPage,
});

const STATUS = [
  { v: "scheduled", l: "مجدول", c: "bg-blue-500/10 text-blue-700" },
  { v: "completed", l: "تم", c: "bg-green-500/10 text-green-700" },
  { v: "cancelled", l: "ملغى", c: "bg-red-500/10 text-red-700" },
  { v: "no_show", l: "لم يحضر", c: "bg-gray-500/10 text-gray-700" },
];

const fmt = (s: string) => new Date(s).toLocaleString("ar-DZ", { dateStyle: "medium", timeStyle: "short" });

function AppointmentsPage() {
  const qc = useQueryClient();
  const list = useTypedServerFn(listAppointments);
  const save = useTypedServerFn(upsertAppointment);
  const del = useTypedServerFn(deleteAppointment);
  const lc = useTypedServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["pro_appointments"], queryFn: () => list() });
  const { data: clientsData } = useQuery({ queryKey: ["pro_clients"], queryFn: () => lc() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "scheduled", duration_minutes: 60 });

  const groups = useMemo(() => {
    const arr = data?.appointments ?? [];
    const now = Date.now();
    return {
      upcoming: arr.filter((a: any) => new Date(a.scheduled_at).getTime() >= now && a.status === "scheduled"),
      past: arr.filter((a: any) => new Date(a.scheduled_at).getTime() < now || a.status !== "scheduled"),
    };
  }, [data]);

  const mut = useMutation({
    mutationFn: () => save({
      ...form,
      client_id: form.client_id || null,
      duration_minutes: Number(form.duration_minutes ?? 60),
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    } as never),
    onSuccess: () => { toast.success("تم الحفظ"); setOpen(false); setForm({ status: "scheduled", duration_minutes: 60 }); qc.invalidateQueries({ queryKey: ["pro_appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["pro_appointments"] }) });

  const renderCard = (a: any) => {
    const st = STATUS.find(s => s.v === a.status);
    return <Card key={a.id}><CardContent className="pt-6 flex justify-between items-start gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{a.title}</h3>
          {st && <Badge className={st.c}>{st.l}</Badge>}
        </div>
        {a.pro_clients && <p className="text-sm text-muted-foreground mt-1">العميل: {a.pro_clients.full_name}{a.pro_clients.company ? ` — ${a.pro_clients.company}` : ""}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
          <span className="flex items-center gap-1"><CalIcon className="h-3 w-3" />{fmt(a.scheduled_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_minutes} د</span>
          {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
        </div>
        {a.notes && <p className="text-sm text-muted-foreground mt-2">{a.notes}</p>}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => { setForm({ ...a, scheduled_at: a.scheduled_at.slice(0, 16) }); setOpen(true); }}>تعديل</Button>
        <Button size="sm" variant="ghost" onClick={() => delMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </CardContent></Card>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><CalIcon className="h-6 w-6 text-primary" /><h2 className="text-2xl font-bold">المواعيد</h2></div>
        <Button onClick={() => { setForm({ status: "scheduled", duration_minutes: 60 }); setOpen(true); }}><Plus className="h-4 w-4 ml-2" />موعد جديد</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      : (!groups.upcoming.length && !groups.past.length) ? <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مواعيد</CardContent></Card>
      : <>
        {groups.upcoming.length > 0 && <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">القادمة ({groups.upcoming.length})</h3>
          <div className="grid gap-3">{groups.upcoming.map(renderCard)}</div>
        </div>}
        {groups.past.length > 0 && <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">السابقة ({groups.past.length})</h3>
          <div className="grid gap-3 opacity-75">{groups.past.map(renderCard)}</div>
        </div>}
      </>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "تعديل" : "إضافة"} موعد</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
            <div><Label>العنوان *</Label><Input value={form.title ?? ""} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ والوقت *</Label><Input type="datetime-local" value={form.scheduled_at ?? ""} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} required className="mt-1" /></div>
              <div><Label>المدة (دقيقة)</Label><Input type="number" min={5} value={form.duration_minutes ?? 60} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1" /></div>
              <div><Label>العميل</Label><Select value={form.client_id ?? ""} onValueChange={v => setForm({ ...form, client_id: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{(clientsData?.clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>الحالة</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>الموقع</Label><Input value={form.location ?? ""} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="مكتب / Zoom / Meet..." className="mt-1" /></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="submit" disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}حفظ</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
