import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, MessageSquare, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";

type DateFilter = "all" | "today" | "week" | "month";

const DATE_LABELS: Record<DateFilter, string> = {
  all: "كل الفترات",
  today: "اليوم",
  week: "آخر 7 أيام",
  month: "آخر 30 يوماً",
};

function withinRange(updatedAt: string, range: DateFilter): boolean {
  if (range === "all") return true;
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return updated >= start.getTime();
  }
  if (range === "week") return now - updated <= 7 * day;
  if (range === "month") return now - updated <= 30 * day;
  return true;
}

export function AiChatLayout({
  activeThreadId,
  children,
}: {
  activeThreadId?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  useEffect(() => setHydrated(true), []);

  const threadsQ = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => listFn(),
    enabled: hydrated,
  });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      navigate({ to: "/dashboard/ai-chat/$threadId", params: { threadId: t.id } });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      if (id === activeThreadId) navigate({ to: "/dashboard/ai-chat" });
      router.invalidate();
    },
  });

  const allThreads = threadsQ.data ?? [];
  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allThreads.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (!withinRange(t.updated_at, dateFilter)) return false;
      return true;
    });
  }, [allThreads, search, dateFilter]);

  const hasFilters = search.trim() !== "" || dateFilter !== "all";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Threads sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-l bg-background shrink-0">
        <div className="p-3 border-b space-y-2">
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="w-full justify-start gap-2"
            variant="default"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            محادثة جديدة
          </Button>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في المحادثات…"
              className="h-8 pr-8 pl-7 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="التاريخ" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DATE_LABELS) as DateFilter[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {DATE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threadsQ.isLoading && (
              <div className="text-xs text-muted-foreground p-3">جارٍ التحميل…</div>
            )}
            {!threadsQ.isLoading && allThreads.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center">
                لا توجد محادثات. ابدأ واحدة جديدة.
              </div>
            )}
            {!threadsQ.isLoading && allThreads.length > 0 && filteredThreads.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center space-y-2">
                <div>لا نتائج مطابقة.</div>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDateFilter("all");
                    }}
                    className="text-primary hover:underline"
                  >
                    مسح المرشحات
                  </button>
                )}
              </div>
            )}
            {filteredThreads.map((t) => {
              const active = t.id === activeThreadId;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <Link
                    to="/dashboard/ai-chat/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 min-w-0 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("حذف هذه المحادثة؟")) deleteMut.mutate(t.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-3 border-t text-[10px] text-muted-foreground flex items-center gap-2">
          <Bot className="h-3 w-3" /> مساعد AuditNova مدعوم بـ Lovable AI
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 min-w-0 flex flex-col bg-muted/20">{children}</div>
    </div>
  );
}
