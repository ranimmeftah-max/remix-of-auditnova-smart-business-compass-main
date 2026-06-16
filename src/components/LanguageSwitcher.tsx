import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

const LABELS: Record<string, string> = { ar: "العربية", fr: "Français", en: "English" };

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{LABELS[i18n.resolvedLanguage ?? "ar"]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((l) => (
          <DropdownMenuItem key={l} onClick={() => i18n.changeLanguage(l)}>
            {LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
