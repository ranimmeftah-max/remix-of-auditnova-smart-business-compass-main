
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ai TEXT;

CREATE TABLE public.g50_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_year INT NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','submitted','paid')),
  input_data JSONB NOT NULL DEFAULT '{}',
  computed_data JSONB NOT NULL DEFAULT '{}',
  total_due NUMERIC NOT NULL DEFAULT 0,
  deadline_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_year, period_month)
);
CREATE INDEX idx_g50_user_period ON public.g50_declarations(user_id, period_year DESC, period_month DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.g50_declarations TO authenticated;
GRANT ALL ON public.g50_declarations TO service_role;
ALTER TABLE public.g50_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "g50_own" ON public.g50_declarations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_g50_upd BEFORE UPDATE ON public.g50_declarations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_type TEXT NOT NULL DEFAULT 'sale' CHECK (invoice_type IN ('sale','purchase')),
  seller_name TEXT NOT NULL,
  seller_nif TEXT,
  seller_nis TEXT,
  seller_rc TEXT,
  seller_ai TEXT,
  seller_address TEXT,
  buyer_name TEXT NOT NULL,
  buyer_nif TEXT,
  buyer_address TEXT,
  lines JSONB NOT NULL DEFAULT '[]',
  totals JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tax_invoices_user ON public.tax_invoices(user_id, invoice_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_invoices TO authenticated;
GRANT ALL ON public.tax_invoices TO service_role;
ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_invoices_own" ON public.tax_invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tax_invoices_upd BEFORE UPDATE ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.payroll_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_year INT NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  employee_name TEXT NOT NULL,
  matricule TEXT,
  job_title TEXT,
  hire_date DATE,
  days_worked INT DEFAULT 26,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  cnas_employee NUMERIC NOT NULL DEFAULT 0,
  cnas_employer NUMERIC NOT NULL DEFAULT 0,
  irg NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  employer_name TEXT,
  employer_nif TEXT,
  employer_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payroll_user ON public.payroll_slips(user_id, period_year DESC, period_month DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_slips TO authenticated;
GRANT ALL ON public.payroll_slips TO service_role;
ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_own" ON public.payroll_slips FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payroll_upd BEFORE UPDATE ON public.payroll_slips
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.scf_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  class_num INT NOT NULL CHECK (class_num BETWEEN 1 AND 7),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
CREATE INDEX idx_scf_accounts_user ON public.scf_accounts(user_id, class_num, code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scf_accounts TO authenticated;
GRANT ALL ON public.scf_accounts TO service_role;
ALTER TABLE public.scf_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scf_accounts_own" ON public.scf_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.scf_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scf_journal_user ON public.scf_journal_entries(user_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scf_journal_entries TO authenticated;
GRANT ALL ON public.scf_journal_entries TO service_role;
ALTER TABLE public.scf_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scf_journal_own" ON public.scf_journal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_scf_journal_upd BEFORE UPDATE ON public.scf_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.scf_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.scf_journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  label TEXT,
  debit NUMERIC NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC NOT NULL DEFAULT 0 CHECK (credit >= 0),
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_scf_lines_entry ON public.scf_journal_lines(entry_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scf_journal_lines TO authenticated;
GRANT ALL ON public.scf_journal_lines TO service_role;
ALTER TABLE public.scf_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scf_lines_own" ON public.scf_journal_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scf_journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scf_journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()));

CREATE TABLE public.tax_legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  year INT,
  content TEXT NOT NULL,
  keywords TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tax_legal_documents TO anon, authenticated;
GRANT ALL ON public.tax_legal_documents TO service_role;
ALTER TABLE public.tax_legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_legal_public_read" ON public.tax_legal_documents FOR SELECT USING (is_published = true);
CREATE POLICY "tax_legal_admin" ON public.tax_legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.opportunity_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.investment_opportunities(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, shared_with)
);
GRANT SELECT, INSERT, DELETE ON public.opportunity_shares TO authenticated;
GRANT ALL ON public.opportunity_shares TO service_role;
ALTER TABLE public.opportunity_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opp_share_owner" ON public.opportunity_shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "opp_share_recipient_read" ON public.opportunity_shares FOR SELECT TO authenticated
  USING (auth.uid() = shared_with);

INSERT INTO public.tax_legal_documents (title, category, year, content, keywords) VALUES
  ('TVA — Loi de finances 2024', 'TVA', 2024, 'Taux normal 19%, réduit 9%, exonéré 0%. TVA nette = collectée − déductible. G50 avant le 20.', ARRAY['tva','g50','19%']),
  ('IRG salaires — Barème 2024', 'IRG', 2024, 'CNAS salarié 9%. Abattement 40% plafonné. Barème: 0%, 20%, 30%, 35%.', ARRAY['irg','salaire','cnas']),
  ('IBS — Taux sociétés', 'IBS', 2024, '26% taux normal, 19% production. Acomptes mensuels via G50.', ARRAY['ibs','société']),
  ('TAP — Taxe activité professionnelle', 'TAP', 2024, '1,5% production, 2% services.', ARRAY['tap']),
  ('CNAS — Cotisations', 'CNAS', 2024, 'Patronale 26%, salariale 9%. DAS avant 31 janvier.', ARRAY['cnas','das']),
  ('Code de commerce — Dispositions générales', 'Juridique', NULL, 'Référence pour facturation, registre commerce, obligations comptables des commerçants.', ARRAY['commerce','rc']),
  ('SCF — Plan comptable', 'SCF', NULL, '7 classes: capitaux, passif, actif, tiers, financiers, charges, produits.', ARRAY['scf','comptabilité'])
;
