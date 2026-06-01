-- Claims: handler notes + closed_at + assigned_handler
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS handler_notes TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_handler UUID;

-- Claim events (timeline)
CREATE TABLE IF NOT EXISTS public.claim_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_events TO authenticated;
GRANT ALL ON public.claim_events TO service_role;

ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY claim_events_read ON public.claim_events FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role) OR
    has_role(auth.uid(),'agent'::app_role) OR
    has_role(auth.uid(),'assureur'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_events.claim_id
        AND (c.declared_by = auth.uid()
          OR EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id=c.client_id AND cl.client_user_id=auth.uid()))
    )
  );

CREATE POLICY claim_events_insert ON public.claim_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Trigger for auto status logging
CREATE OR REPLACE FUNCTION public.log_claim_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.claim_events
      (claim_id, event_type, old_status, new_status, created_by)
    VALUES
      (NEW.id, 'status_change', OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_events ON public.claims;
CREATE TRIGGER trg_claim_events
  AFTER UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.log_claim_status_change();

-- Constats amiables
CREATE TABLE IF NOT EXISTS public.constats_amiables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id),
  contract_id_a UUID REFERENCES public.contracts(id),
  contract_id_b UUID REFERENCES public.contracts(id),
  assure_a_id UUID REFERENCES public.clients(id),
  assure_b_id UUID REFERENCES public.clients(id),
  date_accident DATE NOT NULL,
  heure_accident TIME,
  lieu TEXT NOT NULL,
  circonstances TEXT,
  temoins JSONB NOT NULL DEFAULT '[]'::jsonb,
  degats_vehicule_a TEXT,
  degats_vehicule_b TEXT,
  blesses BOOLEAN NOT NULL DEFAULT false,
  description_blesses TEXT,
  schema_accident TEXT,
  responsabilite_a INT NOT NULL DEFAULT 50,
  responsabilite_b INT NOT NULL DEFAULT 50,
  signe_a_at TIMESTAMPTZ,
  signe_b_at TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'en_attente_signature',
  pdf_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.constats_amiables TO authenticated;
GRANT ALL ON public.constats_amiables TO service_role;

ALTER TABLE public.constats_amiables ENABLE ROW LEVEL SECURITY;

CREATE POLICY constats_read ON public.constats_amiables FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'agent'::app_role)
    OR has_role(auth.uid(),'assureur'::app_role)
    OR has_role(auth.uid(),'autorite'::app_role)
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id IN (assure_a_id, assure_b_id) AND c.client_user_id = auth.uid())
  );

CREATE POLICY constats_insert ON public.constats_amiables FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY constats_update ON public.constats_amiables FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'agent'::app_role)
    OR has_role(auth.uid(),'assureur'::app_role)
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id IN (assure_a_id, assure_b_id) AND c.client_user_id = auth.uid())
  );

-- Avenants
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS parent_contract_id UUID REFERENCES public.contracts(id);

CREATE TABLE IF NOT EXISTS public.avenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  avenant_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'changement_vehicule','changement_adresse','ajout_garantie',
    'suppression_garantie','changement_beneficiaire',
    'suspension','remise_en_vigueur','autre'
  )),
  description TEXT,
  ancienne_valeur JSONB NOT NULL DEFAULT '{}'::jsonb,
  nouvelle_valeur JSONB NOT NULL DEFAULT '{}'::jsonb,
  prime_avant NUMERIC(14,2),
  prime_apres NUMERIC(14,2),
  delta_prime NUMERIC(14,2) GENERATED ALWAYS AS (COALESCE(prime_apres,0) - COALESCE(prime_avant,0)) STORED,
  effective_date DATE NOT NULL,
  created_by UUID,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avenants TO authenticated;
GRANT ALL ON public.avenants TO service_role;

ALTER TABLE public.avenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY avenants_read ON public.avenants FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'agent'::app_role)
    OR has_role(auth.uid(),'assureur'::app_role)
    OR has_role(auth.uid(),'courtier'::app_role)
    OR EXISTS (SELECT 1 FROM public.contracts ct JOIN public.clients cl ON cl.id=ct.client_id WHERE ct.id=avenants.contract_id AND cl.client_user_id=auth.uid())
  );

CREATE POLICY avenants_write ON public.avenants FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'agent'::app_role)
    OR has_role(auth.uid(),'assureur'::app_role)
    OR has_role(auth.uid(),'courtier'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'agent'::app_role)
    OR has_role(auth.uid(),'assureur'::app_role)
    OR has_role(auth.uid(),'courtier'::app_role)
  );