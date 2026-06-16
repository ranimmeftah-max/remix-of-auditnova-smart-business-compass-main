import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Square, User, Sparkles, Loader2, FileDown, Paperclip, X, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getMessages } from "@/lib/chat.functions";
import { AiChatLayout } from "@/components/AiChatLayout";
import { exportChatToPdf } from "@/lib/export-chat-pdf";
import { MessageFeedback } from "@/components/MessageFeedback";
import {
  ACCEPT_ATTR,
  MAX_FILE_SIZE,
  classifyFile,
  formatBytes,
  parseSpreadsheetToText,
  type AttachedFile,
} from "@/lib/chat-attachments";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/ai-chat/$threadId")({
  component: ThreadPage,
});

const SUGGESTIONS = [
  "اشرح لي معايير IFRS 15 للاعتراف بالإيرادات",
  "ما هي الإجراءات الجبائية لمؤسسة SARL جزائرية جديدة؟",
  "كيف أقيّم المخاطر التشغيلية وفق إطار COSO؟",
  "ما الفرق بين CASNOS و CNAS من حيث الاشتراكات؟",
];

function ThreadPage() {
  const { threadId } = Route.useParams();
  return (
    <AiChatLayout activeThreadId={threadId}>
      <ChatWindow threadId={threadId} />
    </AiChatLayout>
  );
}

function ChatWindow({ threadId }: { threadId: string }) {
  const getMsgsFn = useServerFn(getMessages);
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const initialQ = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: () => getMsgsFn({ data: { threadId } }),
    enabled: hydrated,
    staleTime: Infinity,
  });

  const initialMessages: UIMessage[] = useMemo(
    () =>
      (initialQ.data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: (m.parts as unknown as UIMessage["parts"]) ?? [],
      })),
    [initialQ.data],
  );

  if (!hydrated || initialQ.isLoading || !token) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <ChatInner key={threadId} threadId={threadId} initialMessages={initialMessages} token={token} />
  );
}

function ChatInner({
  threadId,
  initialMessages,
  token,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  token: string;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { threadId },
      }),
    [token, threadId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const handleFilesPicked = (fileList: FileList | null) => {
    if (!fileList) return;
    const newOnes: AttachedFile[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: حجم الملف يتجاوز ${formatBytes(MAX_FILE_SIZE)}`);
        continue;
      }
      const kind = classifyFile(f);
      if (!kind) {
        toast.error(`${f.name}: نوع غير مدعوم (PDF، صور، Excel، CSV)`);
        continue;
      }
      newOnes.push({ id: `${f.name}-${f.size}-${Math.random()}`, file: f, kind });
    }
    if (newOnes.length) setAttachments((prev) => [...prev, ...newOnes]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleSend = async (text: string) => {
    const t = text.trim();
    if (isBusy || processing) return;
    if (!t && attachments.length === 0) return;
    setProcessing(true);
    try {
      const sheetTextParts: string[] = [];
      const fileAttachments: File[] = [];
      for (const a of attachments) {
        if (a.kind === "spreadsheet") {
          try {
            const txt = await parseSpreadsheetToText(a.file);
            sheetTextParts.push(`\n\n📊 **ملف: ${a.file.name}**\n${txt}`);
          } catch (e) {
            console.error(e);
            toast.error(`فشل قراءة ${a.file.name}`);
          }
        } else {
          fileAttachments.push(a.file);
        }
      }
      const finalText =
        (t || "حلّل الملفات المرفقة من منظور التدقيق والامتثال.") + sheetTextParts.join("");
      setInput("");
      setAttachments([]);
      // Convert File[] to FileList for AI SDK
      let files: FileList | undefined;
      if (fileAttachments.length > 0) {
        const dt = new DataTransfer();
        fileAttachments.forEach((f) => dt.items.add(f));
        files = dt.files;
      }
      await sendMessage({ text: finalText, files });
    } finally {
      setProcessing(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b bg-background/80 backdrop-blur px-4 py-2 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">
          {messages.length > 0 ? `${messages.length} رسالة` : "محادثة جديدة"}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={messages.length === 0}
          onClick={() =>
            exportChatToPdf({
              title: `محادثة AuditNova — ${new Date().toLocaleDateString("ar-DZ")}`,
              messages,
            })
          }
          className="gap-2"
        >
          <FileDown className="h-3.5 w-3.5" />
          تصدير PDF
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6">
          {empty && (
            <div className="text-center py-12">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow items-center justify-center mb-4 shadow-elegant">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">مرحباً بك في مساعد AuditNova</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                خبيرك الذكي في التدقيق المحاسبي، الامتثال الجبائي الجزائري، وإدارة المخاطر. اسألني أي شيء.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="text-right text-sm p-3 rounded-xl border bg-card hover:bg-accent hover:border-primary/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} threadId={threadId} isStreaming={status === "streaming"} />
          ))}

          {status === "submitted" && (
            <div className="flex gap-3">
              <Avatar role="assistant" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ التفكير…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-lg p-3">
              حدث خطأ: {error.message}
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background p-3 md:p-4">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy || processing}
              aria-label="إرفاق ملف"
              title="إرفاق PDF / صورة / Excel"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="اسأل عن التدقيق، أو أرفق ملفاً لتحليله…"
              rows={1}
              className="resize-none min-h-[44px] max-h-40 flex-1"
              disabled={isBusy && status === "submitted"}
            />
            {isBusy ? (
              <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="إيقاف">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && attachments.length === 0) || processing}
                aria-label="إرسال"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            )}
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            قد يخطئ المساعد. تحقق من المعلومات الجوهرية مع مختص.
          </p>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: AttachedFile; onRemove: () => void }) {
  const Icon =
    attachment.kind === "image" ? ImageIcon : attachment.kind === "pdf" ? FileText : FileSpreadsheet;
  return (
    <div className="flex items-center gap-2 bg-muted border rounded-lg px-2.5 py-1.5 text-xs max-w-xs">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{attachment.file.name}</div>
        <div className="text-[10px] text-muted-foreground">{formatBytes(attachment.file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive p-0.5"
        aria-label="إزالة"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}


function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
        <User className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
      <Bot className="h-4 w-4" />
    </div>
  );
}

function MessageBubble({
  message,
  threadId,
  isStreaming,
}: {
  message: UIMessage;
  threadId: string;
  isStreaming: boolean;
}) {
  const role = message.role as "user" | "assistant";
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const fileParts = message.parts.filter(
    (p): p is Extract<UIMessage["parts"][number], { type: "file" }> => p.type === "file",
  );

  return (
    <div className={cn("flex gap-3", role === "user" && "flex-row-reverse")}>
      <Avatar role={role} />
      <div className={cn("max-w-[85%] min-w-0 space-y-2", role === "user" ? "text-right" : "text-left")}>
        {fileParts.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", role === "user" && "justify-end")}>
            {fileParts.map((fp, i) => {
              const isImage = fp.mediaType?.startsWith("image/");
              if (isImage) {
                return (
                  <img
                    key={i}
                    src={fp.url}
                    alt={fp.filename ?? "صورة مرفقة"}
                    className="max-h-48 rounded-lg border"
                  />
                );
              }
              return (
                <a
                  key={i}
                  href={fp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-muted border rounded-lg px-3 py-2 text-xs hover:bg-accent"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[200px]">{fp.filename ?? "ملف مرفق"}</span>
                </a>
              );
            })}
          </div>
        )}
        {role === "user" ? (
          text && (
            <div className="inline-block rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
              {text}
            </div>
          )
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:font-semibold prose-pre:bg-muted prose-pre:text-foreground prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{text || "…"}</ReactMarkdown>
            </div>
            {!isStreaming && text && (
              <MessageFeedback messageId={message.id} threadId={threadId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
