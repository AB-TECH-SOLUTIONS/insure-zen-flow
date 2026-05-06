
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS renewal_status TEXT NOT NULL DEFAULT 'actif',
  ADD COLUMN IF NOT EXISTS renewed_from_id UUID REFERENCES public.contracts(id);

CREATE TABLE IF NOT EXISTS public.bordereaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  periode_mois INT NOT NULL CHECK (periode_mois BETWEEN 1 AND 12),
  periode_annee INT NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_contrats INT NOT NULL DEFAULT 0,
  total_prime_nette NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_prime_ttc NUMERIC(14,2) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, periode_mois, periode_annee)
);

ALTER TABLE public.bordereaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bordereaux_rw ON public.bordereaux;
CREATE POLICY bordereaux_rw ON public.bordereaux FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR company_id = public.get_primary_company(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR company_id = public.get_primary_company(auth.uid()));

-- Optional: track is_active on profiles for suspension (6D)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
