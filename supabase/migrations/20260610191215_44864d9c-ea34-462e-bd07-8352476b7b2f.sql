
-- Enums
CREATE TYPE public.opportunity_recommendation AS ENUM ('go','hold','no_go','pending');
CREATE TYPE public.opportunity_status AS ENUM ('screening','due_diligence','negotiation','closed','passed');

-- Table
CREATE TABLE public.investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT,
  stage TEXT,
  wilaya_code INT,
  ticket_size_dzd NUMERIC,
  valuation_dzd NUMERIC,
  revenue_dzd NUMERIC,
  ebitda_dzd NUMERIC,
  description TEXT,
  notes TEXT,
  score_financial INT CHECK (score_financial BETWEEN 0 AND 100),
  score_legal INT CHECK (score_legal BETWEEN 0 AND 100),
  score_market INT CHECK (score_market BETWEEN 0 AND 100),
  score_risk INT CHECK (score_risk BETWEEN 0 AND 100),
  score_team INT CHECK (score_team BETWEEN 0 AND 100),
  score_overall NUMERIC,
  recommendation public.opportunity_recommendation NOT NULL DEFAULT 'pending',
  status public.opportunity_status NOT NULL DEFAULT 'screening',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invopps_user ON public.investment_opportunities(user_id);
CREATE INDEX idx_invopps_status ON public.investment_opportunities(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_opportunities TO authenticated;
GRANT ALL ON public.investment_opportunities TO service_role;

ALTER TABLE public.investment_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own opportunities"
ON public.investment_opportunities
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger: updated_at + auto compute score_overall
CREATE OR REPLACE FUNCTION public.tg_invopps_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  vals NUMERIC[];
  s NUMERIC := 0;
  c INT := 0;
  v NUMERIC;
BEGIN
  NEW.updated_at := now();
  vals := ARRAY[NEW.score_financial, NEW.score_legal, NEW.score_market, NEW.score_risk, NEW.score_team]::NUMERIC[];
  FOREACH v IN ARRAY vals LOOP
    IF v IS NOT NULL THEN s := s + v; c := c + 1; END IF;
  END LOOP;
  IF c > 0 THEN NEW.score_overall := ROUND(s / c, 2); ELSE NEW.score_overall := NULL; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invopps_before_write
BEFORE INSERT OR UPDATE ON public.investment_opportunities
FOR EACH ROW EXECUTE FUNCTION public.tg_invopps_before_write();
