-- 1) Enrichir contracts pour le suivi CA
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS commercial_nature text NOT NULL DEFAULT 'acquisition' CHECK (commercial_nature IN ('acquisition','renouvellement')),
  ADD COLUMN IF NOT EXISTS prime_brute numeric,
  ADD COLUMN IF NOT EXISTS prime_nette numeric,
  ADD COLUMN IF NOT EXISTS reduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accessoires numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acompte_initial numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_company text;

-- 2) Table revenue_objectives
CREATE TABLE IF NOT EXISTS public.revenue_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  product_type public.quote_type,
  target_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, year, month, product_type)
);
ALTER TABLE public.revenue_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ro_read" ON public.revenue_objectives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'courtier') AND company_id IN (SELECT get_user_companies(auth.uid())))
);
CREATE POLICY "ro_write" ON public.revenue_objectives FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid()))
);

CREATE TRIGGER trg_ro_updated_at BEFORE UPDATE ON public.revenue_objectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Table recovery_complaints (recouvrements / impayés)
CREATE TABLE IF NOT EXISTS public.recovery_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  client_id uuid,
  contract_id uuid,
  amount_due numeric NOT NULL DEFAULT 0,
  amount_recovered numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','en_cours','recouvre','perte','contentieux')),
  last_reminder_at date,
  note text,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recovery_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_read" ON public.recovery_complaints FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'courtier') AND company_id IN (SELECT get_user_companies(auth.uid())))
);
CREATE POLICY "rc_write" ON public.recovery_complaints FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'courtier') AND company_id IN (SELECT get_user_companies(auth.uid())))
)
WITH CHECK (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'courtier') AND company_id IN (SELECT get_user_companies(auth.uid())))
);

CREATE TRIGGER trg_rc_updated_at BEFORE UPDATE ON public.recovery_complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Table commission_reversals (reversements de commissions)
CREATE TABLE IF NOT EXISTS public.commission_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contract_id uuid,
  beneficiary_user_id uuid,
  beneficiary_name text,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'a_payer' CHECK (status IN ('a_payer','paye','annule')),
  paid_at date,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_reversals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_read" ON public.commission_reversals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  beneficiary_user_id = auth.uid() OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'courtier') AND company_id IN (SELECT get_user_companies(auth.uid())))
);
CREATE POLICY "cr_write" ON public.commission_reversals FOR ALL TO authenticated
USING (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(),'super_admin') OR
  (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR
  (has_role(auth.uid(),'agent') AND company_id = get_primary_company(auth.uid()))
);

CREATE TRIGGER trg_cr_updated_at BEFORE UPDATE ON public.commission_reversals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Index utiles pour les requêtes CA
CREATE INDEX IF NOT EXISTS idx_contracts_company_start ON public.contracts(company_id, start_date);
CREATE INDEX IF NOT EXISTS idx_payments_company_paid ON public.payments(company_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_ro_company_year ON public.revenue_objectives(company_id, year);