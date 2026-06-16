import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listFeedback, upsertFeedback, removeFeedback } from "@/lib/feedback.functions";

type FeedbackRow = {
  id: string;
  message_id: string;
  rating: number;
  comment: string | null;
  updated_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function MessageFeedback({
  messageId,
  threadId,
}: {
  messageId: string;
  threadId: string;
}) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listFeedback);
  const upsertFn = useServerFn(upsertFeedback);
  const removeFn = useServerFn(removeFeedback);

  // Streaming messages from AI SDK have IDs like `msg_...` and only get a real
  // DB UUID once persisted. Hide the controls until then.
  const isPersisted = UUID_RE.test(messageId);

  const { data: feedbackList } = useQuery({
    queryKey: ["feedback", threadId],
    queryFn: () => listFn({ data: { threadId } }),
    enabled: isPersisted,
    staleTime: 30_000,
  });

  const existing: FeedbackRow | undefined = (feedbackList ?? []).find(
    (f) => f.message_id === messageId,
  );

  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingRating, setPendingRating] = useState<1 | -1 | null>(null);

  useEffect(() => {
    setComment(existing?.comment ?? "");
  }, [existing?.comment, open]);

  if (!isPersisted) return null;

  const rate = async (rating: 1 | -1) => {
    if (existing && existing.rating === rating) {
      // toggle off
      setPendingRating(rating);
      try {
        await removeFn({ data: { messageId } });
        await queryClient.invalidateQueries({ queryKey: ["feedback", threadId] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "تعذر إزالة التقييم");
      } finally {
        setPendingRating(null);
      }
      return;
    }
    setPendingRating(rating);
    try {
      await upsertFn({
        data: { messageId, rating, comment: existing?.comment ?? null },
      });
      await queryClient.invalidateQueries({ queryKey: ["feedback", threadId] });
      toast.success(rating === 1 ? "شكراً على تقييمك الإيجابي" : "تم تسجيل ملاحظتك");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ التقييم");
    } finally {
      setPendingRating(null);
    }
  };

  const saveComment = async () => {
    if (!existing && !comment.trim()) {
      toast.error("اختر 👍 أو 👎 أولاً");
      return;
    }
    setSaving(true);
    try {
      await upsertFn({
        data: {
          messageId,
          rating: (existing?.rating ?? -1) as 1 | -1,
          comment: comment.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["feedback", threadId] });
      toast.success("تم حفظ التعليق");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر حفظ التعليق");
    } finally {
      setSaving(false);
    }
  };

  const up = existing?.rating === 1;
  const down = existing?.rating === -1;

  return (
    <div className="flex items-center gap-1 mt-2 opacity-70 hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => rate(1)}
        disabled={pendingRating !== null}
        className={cn(
          "p-1.5 rounded-md hover:bg-accent transition-colors",
          up && "text-primary bg-primary/10",
        )}
        aria-label="تقييم إيجابي"
        title="مفيد"
      >
        {pendingRating === 1 ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={() => rate(-1)}
        disabled={pendingRating !== null}
        className={cn(
          "p-1.5 rounded-md hover:bg-accent transition-colors",
          down && "text-destructive bg-destructive/10",
        )}
        aria-label="تقييم سلبي"
        title="غير مفيد"
      >
        {pendingRating === -1 ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ThumbsDown className="h-3.5 w-3.5" />
        )}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-1.5 rounded-md hover:bg-accent transition-colors inline-flex items-center gap-1 text-xs",
              existing?.comment && "text-primary",
            )}
            aria-label="إضافة تعليق"
            title="إضافة تعليق"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {existing?.comment && <Check className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">ملاحظتك على هذا الرد</h4>
            <p className="text-xs text-muted-foreground">
              ساعدنا في تحسين المساعد بمشاركة ما الذي صحّ أو ما الذي يحتاج إلى تحسين.
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="مثال: المعلومة غير دقيقة بخصوص…"
              rows={4}
              maxLength={2000}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button size="sm" onClick={saveComment} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
