
-- Catalog of companies seeking investment (visible to investors)
CREATE TABLE public.company_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT,
  stage TEXT,
  wilaya_code INT REFERENCES public.wilayas(code),
  ticket_size_dzd NUMERIC,
  valuation_dzd NUMERIC,
  revenue_dzd NUMERIC,
  employees_count INT,
  founded_year INT,
  website TEXT,
  contact_email TEXT,
  description TEXT,
  tags TEXT[],
  logo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_listings TO authenticated;
GRANT ALL ON public.company_listings TO service_role;

ALTER TABLE public.company_listings ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own listings
CREATE POLICY "Owners manage their listings" ON public.company_listings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can browse PUBLISHED listings
CREATE POLICY "Authenticated read published listings" ON public.company_listings
  FOR SELECT TO authenticated
  USING (is_published = true);

CREATE TRIGGER company_listings_updated_at
  BEFORE UPDATE ON public.company_listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX company_listings_published_idx ON public.company_listings (is_published, updated_at DESC);
CREATE INDEX company_listings_sector_idx ON public.company_listings (sector);
CREATE INDEX company_listings_wilaya_idx ON public.company_listings (wilaya_code);
