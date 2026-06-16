import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ensureAcademicAccount } from "@/lib/academic-access";
import { listCourses } from "@/lib/lms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/learning")({
  beforeLoad: ensureAcademicAccount,
  head: () => ({
    meta: [{ title: "مركز التعلم — AuditNova" }, { name: "robots", content: "noindex" }],
  }),
  component: LearningCatalog,
});

function LearningCatalog() {
  const { t, i18n } = useTranslation();
  const fetchCourses = useServerFn(listCourses);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["lms-courses", q, level, language],
    queryFn: () =>
      fetchCourses({
        data: {
          q: q || undefined,
          level: level !== "all" ? (level as "beginner" | "intermediate" | "advanced") : undefined,
          language: language !== "all" ? (language as "ar" | "fr" | "en") : undefined,
        },
      }),
  });

  const courses = data?.courses ?? [];
  const isRTL = i18n.dir() === "rtl";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          {t("lms.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("lms.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder={t("lms.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue placeholder={t("lms.level")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("lms.allLevels")}</SelectItem>
            <SelectItem value="beginner">{t("lms.levels.beginner")}</SelectItem>
            <SelectItem value="intermediate">{t("lms.levels.intermediate")}</SelectItem>
            <SelectItem value="advanced">{t("lms.levels.advanced")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger><SelectValue placeholder={t("lms.language")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("lms.allLanguages")}</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}

      {!isLoading && courses.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {t("lms.empty")}
        </CardContent></Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Link
            key={c.id}
            to="/dashboard/courses/$slug"
            params={{ slug: c.slug }}
            className="group"
          >
            <Card className="overflow-hidden h-full hover:shadow-elegant transition-shadow border-border/60">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {c.cover_url ? (
                  <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center gradient-brand">
                    <GraduationCap className="h-12 w-12 text-primary-foreground/80" />
                  </div>
                )}
                {c.price_dzd === 0 && (
                  <Badge className="absolute top-2 start-2" variant="secondary">{t("lms.free")}</Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{t(`lms.levels.${c.level}`)}</Badge>
                  {c.duration_minutes ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round((c.duration_minutes ?? 0) / 60)}{t("lms.hours")}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {c.title}
                </h3>
                {c.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.subtitle}</p>
                )}
                <div className="mt-3 text-sm font-medium" dir={isRTL ? "rtl" : "ltr"}>
                  {c.price_dzd === 0 ? t("lms.free") : `${c.price_dzd.toLocaleString()} ${t("pricing.currency")}`}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
