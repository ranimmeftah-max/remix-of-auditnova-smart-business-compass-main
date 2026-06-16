import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ar from "@/locales/ar.json";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";

export const SUPPORTED_LOCALES = ["ar", "fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ar: { translation: ar },
        fr: { translation: fr },
        en: { translation: en },
      },
      fallbackLng: "ar",
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "auditnova_locale",
      },
    });
}

export function applyDirection(lang: string) {
  if (typeof document === "undefined") return;
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

i18n.on("languageChanged", applyDirection);

export default i18n;
