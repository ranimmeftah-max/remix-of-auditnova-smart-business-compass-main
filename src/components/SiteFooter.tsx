import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <Logo size={28} />
        <p className="text-sm text-muted-foreground">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
        <p className="text-xs text-muted-foreground">{t("footer.made")}</p>
      </div>
    </footer>
  );
}
