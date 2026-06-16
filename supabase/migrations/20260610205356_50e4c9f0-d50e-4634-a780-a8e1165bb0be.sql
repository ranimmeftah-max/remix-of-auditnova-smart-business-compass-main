
-- pro_clients
CREATE TABLE public.pro_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  sector TEXT,
  wilaya_code INT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_clients TO authenticated;
GRANT ALL ON public.pro_clients TO service_role;
ALTER TABLE public.pro_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_clients" ON public.pro_clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_pro_clients BEFORE UPDATE ON public.pro_clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pro_clients_user ON public.pro_clients(user_id);

-- pro_engagements
CREATE TABLE public.pro_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.pro_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  engagement_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  fee_dzd NUMERIC,
  progress INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_engagements TO authenticated;
GRANT ALL ON public.pro_engagements TO service_role;
ALTER TABLE public.pro_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_engagements" ON public.pro_engagements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_pro_engagements BEFORE UPDATE ON public.pro_engagements FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pro_engagements_user ON public.pro_engagements(user_id);

-- pro_analyses
CREATE TABLE public.pro_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.pro_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  analysis_type TEXT,
  score NUMERIC,
  summary TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_analyses TO authenticated;
GRANT ALL ON public.pro_analyses TO service_role;
ALTER TABLE public.pro_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_analyses" ON public.pro_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_pro_analyses BEFORE UPDATE ON public.pro_analyses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- pro_compliance_checks
CREATE TABLE public.pro_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.pro_clients(id) ON DELETE SET NULL,
  framework TEXT NOT NULL,
  item TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  severity TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_compliance_checks TO authenticated;
GRANT ALL ON public.pro_compliance_checks TO service_role;
ALTER TABLE public.pro_compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_compliance" ON public.pro_compliance_checks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_pro_compliance BEFORE UPDATE ON public.pro_compliance_checks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- pro_appointments
CREATE TABLE public.pro_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.pro_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_appointments TO authenticated;
GRANT ALL ON public.pro_appointments TO service_role;
ALTER TABLE public.pro_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_appointments" ON public.pro_appointments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_pro_appointments BEFORE UPDATE ON public.pro_appointments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pro_appointments_user_time ON public.pro_appointments(user_id, scheduled_at);
