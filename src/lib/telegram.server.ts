function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Telegram is not configured");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error: ${res.status} ${body}`);
  }
}

export function formatSubscriptionTelegramMessage(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  accountType: string;
  accountSubtype: string;
  planId: string;
  locale: string;
}) {
  const lines = [
    "<b>🆕 طلب اشتراك جديد — AuditNova</b>",
    "",
    `<b>الاسم:</b> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}`,
    `<b>البريد:</b> ${escapeHtml(data.email)}`,
    `<b>الهاتف:</b> ${escapeHtml(data.phone)}`,
    `<b>المدينة:</b> ${escapeHtml(data.city)}`,
    `<b>نوع الحساب:</b> ${escapeHtml(data.accountType)}`,
    `<b>التخصص:</b> ${escapeHtml(data.accountSubtype)}`,
    `<b>الباقة:</b> ${escapeHtml(data.planId)}`,
    `<b>اللغة:</b> ${escapeHtml(data.locale)}`,
  ];
  return lines.join("\n");
}
