import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  Trash2,
  Plus,
  X,
  ArrowRight,
  Check,
  CheckCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations,
  getThread,
  sendMessage,
  markThreadRead,
  deleteMessage,
  searchUsers,
  heartbeat,
} from "@/lib/messages.functions";

const messagesSearchSchema = z.object({
  peer: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  validateSearch: messagesSearchSchema,
  head: () => ({ meta: [{ title: "الرسائل — AuditNova" }] }),
  component: MessagesPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">404</div>,
});

type ProfileMini = {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  last_seen_at?: string | null;
};
type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function displayName(p: ProfileMini | null | undefined): string {
  if (!p) return "مستخدم";
  const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return n || p.email || "مستخدم";
}
function initials(p: ProfileMini | null | undefined): string {
  const n = displayName(p);
  const parts = n.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  return `${Math.floor(h / 24)} ي`;
}
function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}
function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "اليوم";
  if (sameDay(d, yesterday)) return "أمس";
  return d.toLocaleDateString("ar", { day: "2-digit", month: "long", year: "numeric" });
}
function lastSeenLabel(iso: string | null | undefined): string {
  if (!iso) return "غير متصل";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "متصل الآن";
  if (diff < 5 * 60_000) return `نشط منذ ${Math.floor(diff / 60_000)} د`;
  return `آخر ظهور ${timeAgoShort(iso)}`;
}
function isOnline(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 60_000;
}

function MessagesPage() {
  const { t } = useTranslation();
  const { peer: peerFromUrl } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listConversations);
  const threadFn = useTypedServerFn(getThread);
  const sendFn = useTypedServerFn(sendMessage);
  const readFn = useTypedServerFn(markThreadRead);
  const delFn = useTypedServerFn(deleteMessage);
  const searchFn = useTypedServerFn(searchUsers);
  const beatFn = useTypedServerFn(heartbeat);

  const [activePeer, setActivePeer] = useState<string | null>(peerFromUrl ?? null);
  const [draft, setDraft] = useState("");
  const [newDlgOpen, setNewDlgOpen] = useState(false);
  const [userQ, setUserQ] = useState("");

  useEffect(() => {
    if (peerFromUrl) setActivePeer(peerFromUrl);
  }, [peerFromUrl]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeight = useRef<number>(0);
  const stickToBottom = useRef<boolean>(true);

  const convQ = useQuery({ queryKey: ["dm-conversations"], queryFn: () => listFn() });

  const threadInfQ = useInfiniteQuery({
    queryKey: ["dm-thread-inf", activePeer],
    enabled: !!activePeer,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      threadFn({ peerId: activePeer!, before: pageParam, limit: 30 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const searchQ = useQuery({
    queryKey: ["dm-user-search", userQ],
    queryFn: () => searchFn({ q: userQ }),
    enabled: newDlgOpen && userQ.trim().length >= 2,
  });

  // Aggregate pages -> oldest first
  const allMessages: Message[] = useMemo(() => {
    const pages = threadInfQ.data?.pages ?? [];
    const ordered = [...pages].reverse(); // oldest page first
    const out: Message[] = [];
    for (const p of ordered) out.push(...p.messages);
    // de-dup by id (realtime may overlap)
    const seen = new Set<string>();
    return out.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [threadInfQ.data]);

  const peerProfile: ProfileMini | null =
    threadInfQ.data?.pages?.[0]?.peer ??
    convQ.data?.find((c) => c.peer_id === activePeer)?.profile ??
    null;

  // Heartbeat: mark current user as online
  useEffect(() => {
    if (!user?.id) return;
    beatFn().catch(() => {});
    const id = setInterval(() => beatFn().catch(() => {}), 45_000);
    const onVis = () => {
      if (document.visibilityState === "visible") beatFn().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, beatFn]);

  // Realtime: new messages, read receipts, peer presence
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("dm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["dm-conversations"] });
          if (activePeer) qc.invalidateQueries({ queryKey: ["dm-thread-inf", activePeer] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (activePeer && (payload.new as { id?: string }).id === activePeer) {
            qc.invalidateQueries({ queryKey: ["dm-thread-inf", activePeer] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, user?.id, activePeer]);

  // Mark as read when thread opens or new incoming arrives
  useEffect(() => {
    if (!activePeer) return;
    readFn({ peerId: activePeer })
      .then(() => qc.invalidateQueries({ queryKey: ["dm-conversations"] }))
      .catch(() => {});
  }, [activePeer, readFn, qc, allMessages.length]);

  // Refresh peer presence every 30s while thread is open
  useEffect(() => {
    if (!activePeer) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["dm-thread-inf", activePeer] });
    }, 30_000);
    return () => clearInterval(id);
  }, [activePeer, qc]);

  // Infinite scroll: load older when user reaches top
  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (
            e.isIntersecting &&
            threadInfQ.hasNextPage &&
            !threadInfQ.isFetchingNextPage
          ) {
            prevScrollHeight.current = root.scrollHeight;
            stickToBottom.current = false;
            threadInfQ.fetchNextPage();
          }
        }
      },
      { root, threshold: 0.1 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [threadInfQ, activePeer]);

  // Preserve scroll position when prepending older messages; otherwise stick to bottom
  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    if (!stickToBottom.current && prevScrollHeight.current > 0) {
      root.scrollTop = root.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
      stickToBottom.current = true;
    } else {
      root.scrollTop = root.scrollHeight;
    }
  }, [allMessages.length, activePeer]);

  // Detect user scrolling away from bottom -> disable auto-stick
  const onScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const distance = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (distance < 80) stickToBottom.current = true;
  }, []);

  const sendMut = useMutation({
    mutationFn: (vars: { recipientId: string; body: string }) => sendFn(vars),
    onSuccess: () => {
      setDraft("");
      stickToBottom.current = true;
      qc.invalidateQueries({ queryKey: ["dm-thread-inf", activePeer] });
      qc.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الإرسال"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm-thread-inf", activePeer] });
      qc.invalidateQueries({ queryKey: ["dm-conversations"] });
      toast.success("تم حذف الرسالة");
    },
  });

  const conversations = convQ.data ?? [];

  const onSend = () => {
    const body = draft.trim();
    if (!body || !activePeer) return;
    sendMut.mutate({ recipientId: activePeer, body });
  };

  const startConversationWith = (peerId: string) => {
    setActivePeer(peerId);
    setNewDlgOpen(false);
    setUserQ("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="border-b p-3 md:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-lg md:text-xl font-semibold">{t("dashboard.messages")}</h1>
        </div>
        <Dialog open={newDlgOpen} onOpenChange={setNewDlgOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> محادثة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>بدء محادثة جديدة</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder="ابحث بالاسم أو البريد…"
                className="pr-9"
                autoFocus
              />
            </div>
            <ScrollArea className="max-h-72">
              <div className="space-y-1">
                {searchQ.isFetching && (
                  <div className="text-xs text-muted-foreground p-3 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> جارٍ البحث…
                  </div>
                )}
                {!searchQ.isFetching && userQ.trim().length < 2 && (
                  <div className="text-xs text-muted-foreground p-3">اكتب حرفين على الأقل.</div>
                )}
                {!searchQ.isFetching &&
                  userQ.trim().length >= 2 &&
                  (searchQ.data ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground p-3">لا نتائج.</div>
                  )}
                {(searchQ.data ?? []).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => startConversationWith(u.id)}
                    className="w-full text-right flex items-center gap-3 p-2 rounded-md hover:bg-muted transition"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(u)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{displayName(u)}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[20rem_1fr]">
        {/* Conversations sidebar */}
        <aside
          className={cn(
            "border-l bg-background overflow-hidden flex flex-col",
            activePeer ? "hidden md:flex" : "flex",
          )}
        >
          <ScrollArea className="flex-1">
            {convQ.isLoading && (
              <div className="text-xs text-muted-foreground p-4">جارٍ التحميل…</div>
            )}
            {!convQ.isLoading && conversations.length === 0 && (
              <div className="text-sm text-muted-foreground p-6 text-center space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-50" />
                <p>لا توجد محادثات بعد.</p>
                <p className="text-xs">ابدأ محادثة جديدة من الزر أعلاه.</p>
              </div>
            )}
            <div className="p-1">
              {conversations.map((c) => {
                const active = c.peer_id === activePeer;
                return (
                  <button
                    key={c.peer_id}
                    type="button"
                    onClick={() => setActivePeer(c.peer_id)}
                    className={cn(
                      "w-full text-right flex items-center gap-3 p-3 rounded-md transition border-b last:border-b-0",
                      active ? "bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{initials(c.profile)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium truncate">{displayName(c.profile)}</div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgoShort(c.last_at)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="text-xs text-muted-foreground truncate">{c.last_body}</div>
                        {c.unread > 0 && (
                          <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                            {c.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Thread pane */}
        <section
          className={cn(
            "flex flex-col min-w-0 bg-muted/10",
            activePeer ? "flex" : "hidden md:flex",
          )}
        >
          {!activePeer ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              اختر محادثة من القائمة لعرض الرسائل.
            </div>
          ) : (
            <>
              <div className="border-b p-3 flex items-center gap-3 bg-background">
                <button
                  type="button"
                  onClick={() => setActivePeer(null)}
                  className="md:hidden p-1 -ms-1 text-muted-foreground hover:text-foreground"
                  aria-label="عودة"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(peerProfile)}</AvatarFallback>
                  </Avatar>
                  {isOnline(peerProfile?.last_seen_at) && (
                    <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{displayName(peerProfile)}</div>
                  <div
                    className={cn(
                      "text-[11px] truncate",
                      isOnline(peerProfile?.last_seen_at)
                        ? "text-emerald-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {lastSeenLabel(peerProfile?.last_seen_at)}
                  </div>
                </div>
              </div>

              <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto p-4 space-y-2"
              >
                <div ref={topSentinelRef} className="h-1" />
                {threadInfQ.isFetchingNextPage && (
                  <div className="text-xs text-muted-foreground text-center py-2 flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> تحميل الرسائل الأقدم…
                  </div>
                )}
                {!threadInfQ.hasNextPage && allMessages.length > 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-1 opacity-70">
                    بداية المحادثة
                  </div>
                )}
                {threadInfQ.isLoading && (
                  <div className="text-xs text-muted-foreground text-center">جارٍ التحميل…</div>
                )}

                {allMessages.map((m, i) => {
                  const mine = m.sender_id === user?.id;
                  const prev = allMessages[i - 1];
                  const showDay =
                    !prev ||
                    new Date(prev.created_at).toDateString() !==
                      new Date(m.created_at).toDateString();
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                            {formatDayHeader(m.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={cn("flex", mine ? "justify-start" : "justify-end")}>
                        <div
                          className={cn(
                            "group max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm relative",
                            mine
                              ? "bg-primary text-primary-foreground rounded-bl-sm"
                              : "bg-background border rounded-br-sm",
                          )}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div
                            className={cn(
                              "flex items-center gap-1 justify-end text-[10px] mt-1 opacity-80",
                              mine ? "text-primary-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            <span>{formatClock(m.created_at)}</span>
                            {mine &&
                              (m.read_at ? (
                                <CheckCheck
                                  className="h-3 w-3 text-sky-300"
                                  aria-label="تم القراءة"
                                />
                              ) : (
                                <Check className="h-3 w-3" aria-label="تم الإرسال" />
                              ))}
                          </div>
                          {mine && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("حذف هذه الرسالة؟")) delMut.mutate(m.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition absolute -top-2 -left-2 bg-background border rounded-full p-1 text-destructive shadow"
                              aria-label="حذف"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!threadInfQ.isLoading && allMessages.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    لا رسائل بعد. كن أول من يبدأ.
                  </div>
                )}
              </div>

              <Card className="m-3 p-2 rounded-2xl">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    placeholder="اكتب رسالتك… (Enter للإرسال، Shift+Enter لسطر جديد)"
                    rows={2}
                    className="resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent"
                    maxLength={5000}
                  />
                  <Button
                    onClick={onSend}
                    disabled={!draft.trim() || sendMut.isPending}
                    size="icon"
                    className="rounded-full shrink-0"
                    aria-label="إرسال"
                  >
                    {sendMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
