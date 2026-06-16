import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTypedServerFn } from "@/lib/use-typed-server-fn";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  type Notification,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: NotificationsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">404</div>,
});

function timeAgo(iso: string, locale: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return locale === "ar" ? "الآن" : locale === "fr" ? "à l'instant" : "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function typeColor(type: string) {
  switch (type) {
    case "success": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "warning": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "error":   return "bg-destructive/10 text-destructive border-destructive/20";
    default:        return "bg-primary/10 text-primary border-primary/20";
  }
}

function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const listFn = useTypedServerFn(listNotifications);
  const readFn = useTypedServerFn(markRead);
  const readAllFn = useTypedServerFn(markAllRead);
  const delFn = useTypedServerFn(deleteNotification);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
  });

  useEffect(() => {
    const ch = supabase
      .channel("notif-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const mRead = useMutation({
    mutationFn: (id: string) => readFn({ id }),
    onSuccess: invalidate,
  });
  const mReadAll = useMutation({
    mutationFn: () => readAllFn(),
    onSuccess: () => { invalidate(); toast.success(t("notifications.allMarkedRead")); },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => delFn({ id }),
    onSuccess: () => { invalidate(); toast.success(t("notifications.deleted")); },
  });

  const items = (data ?? []) as Notification[];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-xl md:text-2xl font-semibold">{t("dashboard.notifications")}</h1>
          {unread > 0 && <Badge variant="secondary">{unread}</Badge>}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={unread === 0 || mReadAll.isPending}
          onClick={() => mReadAll.mutate()}
        >
          <CheckCheck className="h-4 w-4 me-2" />
          {t("notifications.markAllRead")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
            {t("dashboard.noNotifications")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={!n.read_at ? "border-primary/40 bg-primary/[0.02]" : undefined}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-2 min-w-0">
                  <Badge variant="outline" className={typeColor(n.type)}>
                    {n.type}
                  </Badge>
                  <CardTitle className="text-base leading-snug truncate">
                    {n.title}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(n.created_at, i18n.language)}
                </span>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {n.body && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {n.body}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {n.link && (
                    n.link.startsWith("/") ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={n.link}>
                          <ExternalLink className="h-4 w-4 me-1" />
                          {t("notifications.open")}
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="ghost">
                        <a href={n.link} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 me-1" />
                          {t("notifications.open")}
                        </a>
                      </Button>
                    )
                  )}
                  {!n.read_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => mRead.mutate(n.id)}
                      disabled={mRead.isPending}
                    >
                      <Check className="h-4 w-4 me-1" />
                      {t("notifications.markRead")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => mDel.mutate(n.id)}
                    disabled={mDel.isPending}
                  >
                    <Trash2 className="h-4 w-4 me-1" />
                    {t("notifications.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
