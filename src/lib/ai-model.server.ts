import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { LanguageModel } from "ai";

export type AiProviderKind = "lovable" | "google";

function readGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim()
  );
}

export function resolveChatModel(): { model: LanguageModel; provider: AiProviderKind } {
  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  if (lovableKey) {
    const gateway = createLovableAiGatewayProvider(lovableKey);
    return { model: gateway("google/gemini-3-flash-preview"), provider: "lovable" };
  }

  const googleKey = readGoogleApiKey();
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const modelId = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    return { model: google(modelId), provider: "google" };
  }

  throw new Error(
    "لا يوجد مفتاح AI للتشغيل المحلي. أضف GOOGLE_GENERATIVE_AI_API_KEY من Google AI Studio إلى .env، أو استخدم معاينة Lovable.",
  );
}
