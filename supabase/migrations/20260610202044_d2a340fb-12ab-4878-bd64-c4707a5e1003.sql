
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_pair ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages (recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see their messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "users send as themselves"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "recipient marks read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "sender deletes own"
  ON public.direct_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
