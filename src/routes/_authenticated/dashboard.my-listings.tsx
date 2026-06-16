import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  listMyListings,
  upsertMyListing,
  deleteMyListing,
  toggleListingPublished,
  type CompanyListing,
  type UpsertListingInput,
} from "@/lib/discovery.functions";

export const Route = createFileRoute("/_authenticated/dashboard/my-listings")({
  head: () => ({
    meta: [
      { title: "قوائمي — AuditNova" },
      {
        name: "description",
        content: "إدارة قوائم شركتك المنشورة لاكتشافها من قِبل المستثمرين.",
      },
    ],
  }),
  component: MyListingsPage,
});

type FormState = UpsertListingInput;

const empty: FormState = {
  company_name: "",
  sector: "",
  stage: "",
  description: "",
  website: "",
  contact_email: "",
  is_published: false,
};

function MyListingsPage() {
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listMyListings);
  const upsertFn = useTypedServerFn(upsertMyListing);
  const deleteFn = useTypedServerFn(deleteMyListing);
  const toggleFn = useTypedServerFn(toggleListingPublished);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => listFn(),
  });

  const [editing, setEditing] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyListing | null>(null);

  const upsert = useMutation({
    mutationFn: (payload: FormState) => upsertFn(payload),
    onSuccess: () => {
      toast.success("تم الحفظ بنجاح");
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ id }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePub = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => toggleFn(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-listings"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7" /> قوائمي
          </h1>
          <p className="text-muted-foreground mt-1">
            أنشئ قوائم لشركتك وأدِر نشرها لاكتشافها من قِبل المستثمرين.
          </p>
        </div>
        <Button onClick={() => setEditing(empty)}>
          <Plus className="h-4 w-4 me-2" />
          قائمة جديدة
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            لا توجد قوائم بعد. ابدأ بإنشاء أول قائمة لشركتك.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{l.company_name}</CardTitle>
                  <Badge variant={l.is_published ? "default" : "secondary"}>
                    {l.is_published ? "منشورة" : "مسودة"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {l.sector && <Badge variant="outline">{l.sector}</Badge>}
                  {l.stage && <Badge variant="outline">{l.stage}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {l.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {l.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={l.is_published}
                      onCheckedChange={(v) =>
                        togglePub.mutate({ id: l.id, is_published: v })
                      }
                    />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {l.is_published ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {l.is_published ? "ظاهرة" : "مخفية"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          id: l.id,
                          company_name: l.company_name,
                          sector: l.sector ?? "",
                          stage: l.stage ?? "",
                          wilaya_code: l.wilaya_code ?? undefined,
                          ticket_size_dzd: l.ticket_size_dzd ?? undefined,
                          valuation_dzd: l.valuation_dzd ?? undefined,
                          revenue_dzd: l.revenue_dzd ?? undefined,
                          employees_count: l.employees_count ?? undefined,
                          founded_year: l.founded_year ?? undefined,
                          website: l.website ?? "",
                          contact_email: l.contact_email ?? "",
                          description: l.description ?? "",
                          logo_url: l.logo_url ?? "",
                          is_published: l.is_published,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(l)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSave={(v) => upsert.mutate(v)}
        saving={upsert.isPending}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القائمة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{confirmDelete?.company_name}"؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditDialog({
  value,
  onClose,
  onSave,
  saving,
}: {
  value: FormState | null;
  onClose: () => void;
  onSave: (v: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(value ?? empty);
  useEffect(() => {
    if (value) setForm(value);
  }, [value]);

  return (
    <Dialog
      open={!!value}
      onOpenChange={(o) => {
        if (!o) onClose();
        else if (value) setForm(value);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "تعديل القائمة" : "قائمة جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>اسم الشركة *</Label>
            <Input
              value={form.company_name}
              onChange={(e) =>
                setForm({ ...form, company_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>القطاع</Label>
            <Input
              value={form.sector ?? ""}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
            />
          </div>
          <div>
            <Label>المرحلة</Label>
            <Input
              value={form.stage ?? ""}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            />
          </div>
          <div>
            <Label>الولاية (رقم)</Label>
            <Input
              type="number"
              value={form.wilaya_code ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  wilaya_code: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>سنة التأسيس</Label>
            <Input
              type="number"
              value={form.founded_year ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  founded_year: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>حجم التذكرة (د.ج)</Label>
            <Input
              type="number"
              value={form.ticket_size_dzd ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  ticket_size_dzd: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>التقييم (د.ج)</Label>
            <Input
              type="number"
              value={form.valuation_dzd ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  valuation_dzd: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>الإيرادات (د.ج)</Label>
            <Input
              type="number"
              value={form.revenue_dzd ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  revenue_dzd: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>عدد الموظفين</Label>
            <Input
              type="number"
              value={form.employees_count ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  employees_count: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>الموقع الإلكتروني</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.website ?? ""}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div>
            <Label>بريد التواصل</Label>
            <Input
              type="email"
              value={form.contact_email ?? ""}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label>الوصف</Label>
            <Textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 pt-2 border-t">
            <Switch
              checked={!!form.is_published}
              onCheckedChange={(v) => setForm({ ...form, is_published: v })}
            />
            <Label>نشر القائمة للمستثمرين</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.company_name.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
