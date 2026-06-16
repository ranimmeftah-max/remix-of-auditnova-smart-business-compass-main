import type { UIMessage } from "ai";
import { buildPrintHtml, escapeHtml, openPrintDocument } from "@/lib/export-html-pdf";

function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function buildSummary(messages: UIMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  const firstUser = userMsgs[0] ? messageText(userMsgs[0]).slice(0, 280) : "—";
  return `
    <ul>
      <li>عدد الرسائل: <strong>${messages.length}</strong></li>
      <li>أسئلة المستخدم: <strong>${userMsgs.length}</strong></li>
      <li>ردود المساعد: <strong>${assistantMsgs.length}</strong></li>
      <li>السؤال الأول: <em>${escapeHtml(firstUser)}</em></li>
    </ul>
  `;
}

const CHAT_EXTRA_STYLES = `
  header { border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: #6b7280; font-size: 12px; }
  h2 { font-size: 15px; margin: 20px 0 8px; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .summary { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 13px; }
  .summary ul { margin: 0; padding-right: 18px; }
  .summary li { margin: 4px 0; }
  .msg { margin: 14px 0; padding: 12px 14px; border-radius: 8px; page-break-inside: avoid; font-size: 13px; }
  .msg.user { background: #eff6ff; border-right: 3px solid #1e3a5f; }
  .msg.assistant { background: #f9fafb; border-right: 3px solid #6b7280; }
  .role { font-weight: 700; font-size: 11px; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; }
  .content { white-space: pre-wrap; word-wrap: break-word; }
`;

export function exportChatToPdf(opts: {
  title: string;
  messages: UIMessage[];
  createdAt?: string;
}) {
  const { title, messages } = opts;
  const date = new Date().toLocaleString("ar-DZ");

  const messagesHtml = messages
    .map((m) => {
      const isUser = m.role === "user";
      const label = isUser ? "المستخدم" : "AuditNova";
      const text = escapeHtml(messageText(m)).replace(/\n/g, "<br/>");
      return `
        <div class="msg ${isUser ? "user" : "assistant"}">
          <div class="role">${label}</div>
          <div class="content">${text}</div>
        </div>
      `;
    })
    .join("");

  const body = `
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">مساعد AuditNova — تم التصدير في ${date}</div>
  </header>
  <h2>الملخص</h2>
  <div class="summary">${buildSummary(messages)}</div>
  <h2>النص الكامل للمحادثة</h2>
  ${messagesHtml || '<div class="meta">لا توجد رسائل.</div>'}
  <div class="footer">تم إنشاء هذا المستند بواسطة AuditNova — © ${new Date().getFullYear()}</div>`;

  openPrintDocument(
    buildPrintHtml({ title, body, extraStyles: CHAT_EXTRA_STYLES }),
    { width: 900, height: 1000 },
  );
}
