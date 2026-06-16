CREATE TABLE IF NOT EXISTS public.financial_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_plans TO authenticated;
GRANT ALL ON public.financial_plans TO service_role;
ALTER TABLE public.financial_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_plans_own" ON public.financial_plans;
CREATE POLICY "financial_plans_own" ON public.financial_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
