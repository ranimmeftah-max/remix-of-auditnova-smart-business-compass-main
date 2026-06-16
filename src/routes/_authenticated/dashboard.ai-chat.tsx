import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { Bot, Loader2 } from "lucide-react";
import { createThread, listThreads } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/dashboard/ai-chat")({
  head: () => ({ meta: [{ title: "مساعد AuditNova — محادثة ذكية" }] }),
  component: AiChatRoute,
});

function AiChatRoute() {
  return <Outlet />;
}

export function AiChatIndex() {
  const navigate = useNavigate();
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const threads = await listFn();
        if (threads.length > 0) {
          navigate({
            to: "/dashboard/ai-chat/$threadId",
            params: { threadId: threads[0].id },
            replace: true,
          });
          return;
        }
        const t = await createFn({ data: {} });
        navigate({
          to: "/dashboard/ai-chat/$threadId",
          params: { threadId: t.id },
          replace: true,
        });
      } catch (e) {
        console.error("init chat", e);
      }
    })();
  }, [listFn, createFn, navigate]);

  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Bot className="h-10 w-10 text-primary" />
          <Loader2 className="h-4 w-4 animate-spin absolute -bottom-1 -left-1" />
        </div>
        <p className="text-sm">جارٍ تهيئة المحادثة…</p>
      </div>
    </div>
  );
}
