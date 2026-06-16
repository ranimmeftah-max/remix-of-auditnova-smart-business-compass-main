
-- 1) Tighten profiles SELECT
DROP POLICY IF EXISTS "authenticated can view profile basics" ON public.profiles;

CREATE POLICY "View profiles of DM peers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE (dm.sender_id = auth.uid() AND dm.recipient_id = profiles.id)
       OR (dm.recipient_id = auth.uid() AND dm.sender_id = profiles.id)
  )
);

-- 2) Hide contact_email column on company_listings from authenticated readers
REVOKE SELECT (contact_email) ON public.company_listings FROM authenticated;
REVOKE SELECT (contact_email) ON public.company_listings FROM anon;

-- 3) Lock down SECURITY DEFINER queue helpers + add fixed search_path
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb)               SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint)               SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   SET search_path = public, pgmq;

REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)               TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint)               TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   TO service_role;

-- Also lock down has_role: only callable by signed-in users (it leaks role membership otherwise)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4) Default-deny on Realtime broadcast/presence channels
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='realtime' AND table_name='messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "deny all broadcast/presence by default" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "deny all broadcast/presence by default"
      ON realtime.messages FOR SELECT TO authenticated, anon USING (false)$p$;
  END IF;
END $$;
