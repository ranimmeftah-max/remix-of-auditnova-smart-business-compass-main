import { useEffect } from "react";
import i18n, { applyDirection } from "@/lib/i18n";

export function I18nBoot() {
  useEffect(() => {
    applyDirection(i18n.resolvedLanguage ?? "ar");
  }, []);
  return null;
}
