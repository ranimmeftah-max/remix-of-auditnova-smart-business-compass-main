import logoUrl from "@/assets/auditnova-logo.jpg";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function Logo({
  size = 36,
  withWordmark = true,
  variant = "inline",
  className,
  wordmarkClassName,
  imageClassName,
}: {
  size?: number;
  withWordmark?: boolean;
  variant?: "inline" | "stacked";
  className?: string;
  wordmarkClassName?: string;
  imageClassName?: string;
}) {
  const { t } = useTranslation();
  const stacked = variant === "stacked";
  return (
    <Link
      to="/"
      className={[
        stacked ? "flex flex-col items-center gap-3 group" : "flex items-center gap-2 group",
        className ?? "",
      ].join(" ").trim()}
    >
      {withWordmark && stacked && (
        <span
          className={[
            "font-display font-bold text-3xl tracking-tight text-current/95 drop-shadow-sm",
            "group-hover:text-primary-foreground transition-colors",
            wordmarkClassName ?? "",
          ].join(" ").trim()}
        >
          {t("brand.name")}
        </span>
      )}
      <img
        src={logoUrl}
        alt={t("brand.name")}
        width={size}
        height={size}
        className={[
          stacked ? "rounded-full object-cover" : "rounded-md object-contain",
          imageClassName ?? "",
        ].join(" ").trim()}
        style={{ width: size, height: size }}
      />
      {withWordmark && !stacked && (
        <span className={["font-display font-bold text-lg tracking-tight text-secondary group-hover:text-primary transition-colors", wordmarkClassName ?? ""].join(" ").trim()}>
          {t("brand.name")}
        </span>
      )}
    </Link>
  );
}
