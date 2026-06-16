import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveChatModel } from "@/lib/ai-model.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `أنت "مساعد AuditNova" — خبير ذكاء اصطناعي متخصص في:

1) **التدقيق المحاسبي والمالي**: مراجعة القوائم المالية، تحليل النسب المالية، معايير IFRS، النظام المحاسبي المالي الجزائري (SCF)، تدقيق الحسابات الداخلي والخارجي، اكتشاف التلاعب والأخطاء.

2) **الامتثال والقوانين الجزائرية**: الضرائب (IBS، IRG، TAP، TVA)، CASNOS، CNAS، CNRC، قانون العمل الجزائري، قانون التجارة، قانون الاستثمار، الإجراءات الإدارية.

3) **إدارة المخاطر والحوكمة**: إطار COSO، تقييم المخاطر التشغيلية والمالية والامتثالية، الرقابة الداخلية، حوكمة الشركات، خطط الاستمرارية.

4) **تحليل الوثائق المالية**: قراءة وتفسير الميزانيات، حسابات النتائج، التدفقات النقدية، الفواتير، العقود.

**أسلوبك**:
- جواب بالعربية الفصحى المهنية افتراضياً (ما لم يطلب المستخدم لغة أخرى).
- استخدم Markdown منظم: عناوين، قوائم، جداول عند الحاجة.
- استشهد بالمعايير والمواد القانونية بدقة عند توفرها.
- إذا كان السؤال خارج تخصصك، وضّح ذلك واقترح استشارة مختص.
- لا تخترع أرقاماً أو معايير وهمية.
- كن مختصراً وعملياً في الإجابات البسيطة، ومفصلاً في التحليلات المعقدة.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Auth check
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice(7);

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claimsData?.claims?.sub) {
            return new Response("Unauthorized", { status: 401 });
          }
          const userId = claimsData.claims.sub;

          const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string };
          const messages = Array.isArray(body.messages) ? body.messages : [];
          const threadId = body.threadId;
          if (!threadId) return new Response("Missing threadId", { status: 400 });

          // Verify thread ownership
          const { data: thread, error: threadErr } = await supabase
            .from("chat_threads")
            .select("id,title")
            .eq("id", threadId)
            .maybeSingle();
          if (threadErr || !thread) return new Response("Thread not found", { status: 404 });

          // Persist the latest user message
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "user") {
            await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "user",
              parts: lastMessage.parts as never,
            });
            // Auto-title from first user message
            if (thread.title === "محادثة جديدة") {
              const text = lastMessage.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .slice(0, 80);
              if (text) {
                await supabase.from("chat_threads").update({ title: text }).eq("id", threadId);
              }
            }
          }

          const { model } = resolveChatModel();

          let ragContext = "";
          const lastUserText = lastMessage?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join(" ")
            .toLowerCase() ?? "";
          if (lastUserText) {
            try {
              const { TAX_KNOWLEDGE_SNIPPETS, LEGAL_DOCUMENTS_MOCK } = await import("@/lib/tax/mock-data");
              const localHits = TAX_KNOWLEDGE_SNIPPETS.filter(
                (s) => lastUserText.includes(s.category.toLowerCase()) || lastUserText.includes(s.id.split("-")[0]),
              );
              let dbHits: { title: string; content: string }[] = [];
              if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
                const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                  auth: { persistSession: false, autoRefreshToken: false },
                });
                const { data: docs } = await sb
                  .from("tax_legal_documents")
                  .select("title,content,category")
                  .eq("is_published", true)
                  .limit(5);
                dbHits = (docs ?? []).filter(
                  (d) =>
                    lastUserText.includes(d.category.toLowerCase()) ||
                    d.content.toLowerCase().split(" ").some((w) => w.length > 4 && lastUserText.includes(w)),
                );
              }
              if (dbHits.length === 0) {
                dbHits = LEGAL_DOCUMENTS_MOCK.filter(
                  (d) =>
                    lastUserText.includes(d.category.toLowerCase()) ||
                    d.title.toLowerCase().split(" ").some((w) => w.length > 3 && lastUserText.includes(w)),
                ).map((d) => ({ title: d.title, content: d.content }));
              }
              const snippets = [
                ...localHits.map((s) => `### ${s.title}\n${s.content}`),
                ...dbHits.map((d) => `### ${d.title}\n${d.content}`),
              ];
              if (snippets.length > 0) {
                ragContext = `\n\n**Contexte RAG (textes fiscaux/juridiques pertinents):**\n${snippets.join("\n\n")}`;
              }
            } catch {
              const { TAX_KNOWLEDGE_SNIPPETS } = await import("@/lib/tax/mock-data");
              const localHits = TAX_KNOWLEDGE_SNIPPETS.filter((s) => lastUserText.includes(s.id.split("-")[0]));
              if (localHits.length > 0) {
                ragContext = `\n\n**Contexte RAG local:**\n${localHits.map((s) => s.content).join("\n")}`;
              }
            }
          }

          const result = streamText({
            model,
            system: SYSTEM_PROMPT + ragContext,
            messages: await convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ messages: finalMessages }) => {
              const assistantMsg = finalMessages[finalMessages.length - 1];
              if (assistantMsg && assistantMsg.role === "assistant") {
                await supabase.from("chat_messages").insert({
                  thread_id: threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: assistantMsg.parts as never,
                });
                await supabase
                  .from("chat_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              }
            },
          });
        } catch (e) {
          console.error("[/api/chat] error", e);
          const msg = e instanceof Error ? e.message : "Internal error";
          const status = msg.includes("لا يوجد مفتاح AI") ? 503 : 500;
          return new Response(msg, { status });
        }
      },
    },
  },
});
