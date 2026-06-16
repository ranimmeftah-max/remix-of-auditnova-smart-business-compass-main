CREATE TABLE IF NOT EXISTS public.startup_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('readiness', 'investor', 'label1275', 'governance')),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  payload JSONB NOT NULL DEFAULT '{}',
  report JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_assessments_user ON public.startup_assessments(user_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS public.startup_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  due_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_compliance_user ON public.startup_compliance_alerts(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_assessments TO authenticated;
GRANT ALL ON public.startup_assessments TO service_role;
ALTER TABLE public.startup_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "startup_assessments_own" ON public.startup_assessments;
CREATE POLICY "startup_assessments_own" ON public.startup_assessments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_compliance_alerts TO authenticated;
GRANT ALL ON public.startup_compliance_alerts TO service_role;
ALTER TABLE public.startup_compliance_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "startup_compliance_own" ON public.startup_compliance_alerts;
CREATE POLICY "startup_compliance_own" ON public.startup_compliance_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
