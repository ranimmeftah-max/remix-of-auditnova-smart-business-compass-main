
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "authenticated can view profile basics" ON public.profiles;
CREATE POLICY "authenticated can view profile basics"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
