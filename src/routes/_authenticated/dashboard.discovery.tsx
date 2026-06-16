import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  TrendingUp,
  Loader2,
  Plus,
  Globe,
  Mail,
  Users,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import {
  discoverCompanies,
  getDiscoveryFacets,
  addListingToPipeline,
  type CompanyListing,
} from "@/lib/discovery.functions";

export const Route = createFileRoute("/_authenticated/dashboard/discovery")({
  head: () => ({
    meta: [
      { title: "اكتشاف الشركات — AuditNova" },
      {
        name: "description",
        content:
          "تصفّح الشركات الناشئة الباحثة عن استثمار وفلترها حسب القطاع والولاية والحجم.",
      },
    ],
  }),
  component: DiscoveryPage,
});

const ANY = "__any__";
const fmt = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n)
    ? new Intl.NumberFormat("ar-DZ", {
        style: "currency",
        currency: "DZD",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

function DiscoveryPage() {
  const qc = useQueryClient();
  const discover = useTypedServerFn(discoverCompanies);
  const facets = useTypedServerFn(getDiscoveryFacets);
  const addToPipeline = useTypedServerFn(addListingToPipeline);

  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>(ANY);
  const [stage, setStage] = useState<string>(ANY);
  const [wilaya, setWilaya] = useState<string>(ANY);

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      sector: sector === ANY ? undefined : sector,
      stage: stage === ANY ? undefined : stage,
      wilaya_code: wilaya === ANY ? undefined : Number(wilaya),
    }),
    [q, sector, stage, wilaya],
  );

  const facetsQ = useQuery({
    queryKey: ["discovery-facets"],
    queryFn: () => facets(),
  });

  const listQ = useQuery({
    queryKey: ["discovery", filters],
    queryFn: () => discover(filters),
  });

  const addMut = useMutation({
    mutationFn: (company_id: string) => addToPipeline({ company_id }),
    onSuccess: () => {
      toast.success("تمت إضافة الشركة إلى فرصك");
      qc.invalidateQueries({ queryKey: ["inv-list"] });
      qc.invalidateQueries({ queryKey: ["inv-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">اكتشاف الشركات</h1>
        <p className="text-muted-foreground text-sm">
          تصفّح الشركات الباحثة عن تمويل وأضِف ما يهمّك إلى فرص استثمارك.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم الشركة، القطاع، الوصف…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger>
              <SelectValue placeholder="القطاع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل القطاعات</SelectItem>
              {(facetsQ.data?.sectors ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger>
              <SelectValue placeholder="المرحلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل المراحل</SelectItem>
              {(facetsQ.data?.stages ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={wilaya} onValueChange={setWilaya}>
            <SelectTrigger>
              <SelectValue placeholder="الولاية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل الولايات</SelectItem>
              {(facetsQ.data?.wilayas ?? []).map((w) => (
                <SelectItem key={w} value={String(w)}>
                  ولاية {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {listQ.isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-3">
            <p>لا توجد شركات مطابقة حالياً.</p>
            <p className="text-xs">
              جرّب تعديل الفلاتر أو إزالة كلمة البحث.{" "}
              <Link to="/dashboard/evaluation" className="underline">
                اذهب إلى لوحة الفرص
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => (
            <CompanyCard
              key={c.id}
              c={c}
              onAdd={() => addMut.mutate(c.id)}
              adding={addMut.isPending && addMut.variables === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({
  c,
  onAdd,
  adding,
}: {
  c: CompanyListing;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {c.logo_url ? (
              <img
                src={c.logo_url}
                alt={c.company_name}
                className="h-10 w-10 rounded object-cover border"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                {c.company_name.slice(0, 1)}
              </div>
            )}
            <div>
              <CardTitle className="text-base">{c.company_name}</CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {c.sector && <Badge variant="secondary">{c.sector}</Badge>}
                {c.stage && <Badge variant="outline">{c.stage}</Badge>}
              </div>
            </div>
          </div>
          <Badge variant={c.status === "open" ? "default" : "outline"}>
            {c.status === "open" ? "مفتوحة" : c.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {c.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {c.description}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            مطلوب: {fmt(c.ticket_size_dzd)}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {c.wilaya_code ? `ولاية ${c.wilaya_code}` : "—"}
          </div>
          {c.employees_count != null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {c.employees_count} موظف
            </div>
          )}
          {c.founded_year != null && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              تأسست {c.founded_year}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs">
            {c.website && (
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> الموقع
              </a>
            )}
            {/* contact_email is owner-only; reach out via direct messages instead */}
          </div>
          <Button size="sm" onClick={onAdd} disabled={adding}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 ml-1" /> أضف إلى فرصي
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
