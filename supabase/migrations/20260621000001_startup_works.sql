CREATE TABLE IF NOT EXISTS public.startup_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('bmc', 'financial')),
  project_title TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_startup_works_user ON public.startup_works(user_id, module);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_works TO authenticated;
GRANT ALL ON public.startup_works TO service_role;
ALTER TABLE public.startup_works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "startup_works_own" ON public.startup_works;
CREATE POLICY "startup_works_own" ON public.startup_works FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
