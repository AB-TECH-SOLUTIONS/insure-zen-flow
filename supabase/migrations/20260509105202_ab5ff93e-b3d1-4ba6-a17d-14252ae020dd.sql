-- 1. Buckets storage
INSERT INTO storage.buckets (id, name, public) VALUES
  ('garage-documents',   'garage-documents',   false),
  ('expertise-documents','expertise-documents', false),
  ('hopital-documents',  'hopital-documents',   false),
  ('pharmacie-documents','pharmacie-documents', false),
  ('autorite-documents', 'autorite-documents',  false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "garage_docs_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'garage-documents')
  WITH CHECK (bucket_id = 'garage-documents');

CREATE POLICY "expertise_docs_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'expertise-documents')
  WITH CHECK (bucket_id = 'expertise-documents');

CREATE POLICY "hopital_docs_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'hopital-documents')
  WITH CHECK (bucket_id = 'hopital-documents');

CREATE POLICY "pharmacie_docs_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pharmacie-documents')
  WITH CHECK (bucket_id = 'pharmacie-documents');

CREATE POLICY "autorite_docs_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'autorite-documents')
  WITH CHECK (bucket_id = 'autorite-documents');

-- 2. Colonnes additionnelles claims
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS assigned_garage_id   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_expert_id   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS garage_notes         TEXT,
  ADD COLUMN IF NOT EXISTS expert_notes         TEXT,
  ADD COLUMN IF NOT EXISTS lieu_sinistre        TEXT,
  ADD COLUMN IF NOT EXISTS circonstances        TEXT;

-- 3. garage_quotes
CREATE TABLE IF NOT EXISTS public.garage_quotes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id         UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  garage_user_id   UUID NOT NULL REFERENCES auth.users(id),
  description      TEXT,
  montant_pieces   NUMERIC(14,2) NOT NULL DEFAULT 0,
  montant_mo       NUMERIC(14,2) NOT NULL DEFAULT 0,
  montant_total    NUMERIC(14,2) GENERATED ALWAYS AS (montant_pieces + montant_mo) STORED,
  delai_jours      INT,
  statut           TEXT NOT NULL DEFAULT 'brouillon',
  file_urls        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.garage_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY garage_quotes_rw ON public.garage_quotes FOR ALL TO authenticated
  USING (
    garage_user_id = auth.uid()
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'assureur')
  )
  WITH CHECK (garage_user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 4. expertise_reports
CREATE TABLE IF NOT EXISTS public.expertise_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id             UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  expert_user_id       UUID NOT NULL REFERENCES auth.users(id),
  date_expertise       DATE,
  lieu                 TEXT,
  etat_vehicule        TEXT NOT NULL DEFAULT 'reparable',
  valeur_avant         NUMERIC(14,2),
  valeur_apres         NUMERIC(14,2),
  cout_reparation      NUMERIC(14,2),
  responsabilite_assure INT NOT NULL DEFAULT 50,
  nature_dommages      TEXT,
  recommandation       TEXT,
  file_urls            JSONB NOT NULL DEFAULT '[]'::jsonb,
  statut               TEXT NOT NULL DEFAULT 'brouillon',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expertise_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY expertise_rw ON public.expertise_reports FOR ALL TO authenticated
  USING (
    expert_user_id = auth.uid()
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'assureur')
  )
  WITH CHECK (expert_user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 5. health_claims
CREATE TABLE IF NOT EXISTS public.health_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID REFERENCES public.contracts(id),
  client_id           UUID REFERENCES public.clients(id),
  hopital_user_id     UUID NOT NULL REFERENCES auth.users(id),
  type_soin           TEXT NOT NULL,
  description         TEXT,
  montant_soins       NUMERIC(14,2) NOT NULL,
  taux_prise_charge   NUMERIC(5,2) NOT NULL DEFAULT 80,
  montant_assurance   NUMERIC(14,2),
  file_urls           JSONB NOT NULL DEFAULT '[]'::jsonb,
  statut              TEXT NOT NULL DEFAULT 'en_attente',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_claims_rw ON public.health_claims FOR ALL TO authenticated
  USING (
    hopital_user_id = auth.uid()
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'assureur')
  )
  WITH CHECK (hopital_user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 6. pharmacie_claims
CREATE TABLE IF NOT EXISTS public.pharmacie_claims (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           UUID REFERENCES public.contracts(id),
  client_id             UUID REFERENCES public.clients(id),
  pharmacie_user_id     UUID NOT NULL REFERENCES auth.users(id),
  medicaments           JSONB NOT NULL DEFAULT '[]'::jsonb,
  montant_total         NUMERIC(14,2) NOT NULL,
  taux_remboursement    NUMERIC(5,2) NOT NULL DEFAULT 80,
  montant_assurance     NUMERIC(14,2),
  ordonnance_url        TEXT,
  statut                TEXT NOT NULL DEFAULT 'en_attente',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacie_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY pharmacie_claims_rw ON public.pharmacie_claims FOR ALL TO authenticated
  USING (
    pharmacie_user_id = auth.uid()
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'assureur')
  )
  WITH CHECK (pharmacie_user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- 7. official_documents
CREATE TABLE IF NOT EXISTS public.official_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id         UUID REFERENCES public.claims(id),
  contract_id      UUID REFERENCES public.contracts(id),
  deposited_by     UUID NOT NULL REFERENCES auth.users(id),
  document_type    TEXT NOT NULL,
  reference_number TEXT,
  corps_unite      TEXT,
  document_date    DATE,
  resume           TEXT,
  file_url         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY official_docs_rw ON public.official_documents FOR ALL TO authenticated
  USING (
    deposited_by = auth.uid()
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'agent')
    OR public.has_role(auth.uid(),'assureur')
  )
  WITH CHECK (deposited_by = auth.uid() OR public.has_role(auth.uid(),'super_admin'));