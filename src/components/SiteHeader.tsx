import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.home")}
          </Link>
          <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.features")}
          </Link>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.pricing")}
          </Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.about")}
          </Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.contact")}
          </Link>
        </nav>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="ms-2">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "signin" }}>{t("nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="ms-1">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
