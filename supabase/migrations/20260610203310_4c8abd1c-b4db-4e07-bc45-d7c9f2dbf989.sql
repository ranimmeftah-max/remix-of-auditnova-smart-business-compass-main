
-- Enterprise companies primary profile
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  nif TEXT, nis TEXT, rc TEXT,
  sector TEXT, stage TEXT,
  wilaya_code INT REFERENCES public.wilayas(code),
  address TEXT,
  founded_year INT,
  employees_count INT,
  website TEXT, contact_email TEXT, contact_phone TEXT,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own company" ON public.companies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Financial periods (for health, kpi, investment, reports)
CREATE TABLE public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_dzd NUMERIC DEFAULT 0,
  cogs_dzd NUMERIC DEFAULT 0,
  opex_dzd NUMERIC DEFAULT 0,
  ebitda_dzd NUMERIC DEFAULT 0,
  net_income_dzd NUMERIC DEFAULT 0,
  cash_dzd NUMERIC DEFAULT 0,
  assets_dzd NUMERIC DEFAULT 0,
  liabilities_dzd NUMERIC DEFAULT 0,
  equity_dzd NUMERIC DEFAULT 0,
  customers_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_periods TO authenticated;
GRANT ALL ON public.financial_periods TO service_role;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own periods" ON public.financial_periods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX fp_user_idx ON public.financial_periods(user_id, period_end DESC);
CREATE TRIGGER fp_updated_at BEFORE UPDATE ON public.financial_periods FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Risk register
CREATE TYPE public.risk_level AS ENUM ('low','medium','high','critical');
CREATE TYPE public.risk_status AS ENUM ('open','mitigating','closed');
CREATE TABLE public.risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  likelihood public.risk_level NOT NULL DEFAULT 'medium',
  impact public.risk_level NOT NULL DEFAULT 'medium',
  status public.risk_status NOT NULL DEFAULT 'open',
  mitigation TEXT,
  owner TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_items TO authenticated;
GRANT ALL ON public.risk_items TO service_role;
ALTER TABLE public.risk_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own risks" ON public.risk_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER risk_updated_at BEFORE UPDATE ON public.risk_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit reports
CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_label TEXT,
  summary TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_reports TO authenticated;
GRANT ALL ON public.audit_reports TO service_role;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own audit" ON public.audit_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER audit_updated_at BEFORE UPDATE ON public.audit_reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Investment rounds (fundraising tracker)
CREATE TABLE public.investment_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  target_amount_dzd NUMERIC,
  raised_amount_dzd NUMERIC DEFAULT 0,
  pre_money_dzd NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  open_date DATE,
  close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_rounds TO authenticated;
GRANT ALL ON public.investment_rounds TO service_role;
ALTER TABLE public.investment_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own rounds" ON public.investment_rounds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER rounds_updated_at BEFORE UPDATE ON public.investment_rounds FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
