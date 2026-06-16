import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookMarked, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { searchLegalDocs } from "@/lib/tax.functions";

export const Route = createFileRoute("/_authenticated/dashboard/legal-library")({
  head: () => ({ meta: [{ title: "Bibliothèque juridique — AuditNova" }, { name: "robots", content: "noindex" }] }),
  component: LegalLibraryPage,
});

type LegalDoc = { id: string; title: string; category: string; year: number | null; content: string };

function LegalLibraryPage() {
  const searchFn = useTypedServerFn(searchLegalDocs);
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["legal-docs", q],
    queryFn: () => searchFn({ q: q || undefined }),
  });

  const documents = (data?.documents ?? []) as LegalDoc[];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookMarked className="h-7 w-7 text-primary" /> Bibliothèque juridique & Veille
      </h1>
      <div className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ابحث في النصوص القانونية..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-10" />
      </div>
      {isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
      {isError && (
        <p className="text-destructive text-sm">
          تعذّر تحميل المكتبة: {(error as Error).message}
        </p>
      )}
      {!isLoading && !isError && documents.length === 0 && (
        <p className="text-muted-foreground">لا توجد نتائج مطابقة لبحثك.</p>
      )}
      <div className="space-y-3">
        {documents.map((d) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{d.title}</CardTitle>
                <Badge variant="secondary">{d.category}</Badge>
                {d.year && <Badge variant="outline">{d.year}</Badge>}
              </div>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{d.content}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
