CREATE TABLE IF NOT EXISTS public.cde_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('market', 'swot', 'bmc', 'technical', 'costs', 'financial')),
  project_title TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_cde_works_user ON public.cde_works(user_id, module);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cde_works TO authenticated;
GRANT ALL ON public.cde_works TO service_role;
ALTER TABLE public.cde_works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cde_works_own" ON public.cde_works;
CREATE POLICY "cde_works_own" ON public.cde_works FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
