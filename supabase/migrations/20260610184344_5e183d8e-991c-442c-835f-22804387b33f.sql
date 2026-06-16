
CREATE TABLE public.message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_feedback TO authenticated;
GRANT ALL ON public.message_feedback TO service_role;

ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own feedback"
ON public.message_feedback
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_message_feedback_updated_at
BEFORE UPDATE ON public.message_feedback
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_message_feedback_message ON public.message_feedback(message_id);
