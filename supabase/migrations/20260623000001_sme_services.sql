CREATE TABLE IF NOT EXISTS public.sme_compliance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tax',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sme_obligations_user ON public.sme_compliance_obligations(user_id, next_due_date);

CREATE TABLE IF NOT EXISTS public.sme_control_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sme_control_user ON public.sme_control_assessments(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sme_compliance_obligations TO authenticated;
GRANT ALL ON public.sme_compliance_obligations TO service_role;
ALTER TABLE public.sme_compliance_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sme_obligations_own" ON public.sme_compliance_obligations;
CREATE POLICY "sme_obligations_own" ON public.sme_compliance_obligations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sme_control_assessments TO authenticated;
GRANT ALL ON public.sme_control_assessments TO service_role;
ALTER TABLE public.sme_control_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sme_control_own" ON public.sme_control_assessments;
CREATE POLICY "sme_control_own" ON public.sme_control_assessments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
