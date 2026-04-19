-- Séquences de numérotation contrat par compagnie/produit/année
CREATE TABLE IF NOT EXISTS public.contract_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_type public.quote_type NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, product_type, year)
);

ALTER TABLE public.contract_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_sequences_admin_read"
ON public.contract_sequences FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'assureur'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR has_role(auth.uid(), 'courtier'::app_role)
);

-- Fonction atomique : génère le prochain numéro NSIA-AUTO-2025-00001
CREATE OR REPLACE FUNCTION public.next_contract_number(_company_id uuid, _product public.quote_type)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::int;
  _company_code text;
  _product_code text;
  _seq integer;
BEGIN
  SELECT code INTO _company_code FROM public.companies WHERE id = _company_id;
  IF _company_code IS NULL THEN
    RAISE EXCEPTION 'Compagnie introuvable';
  END IF;

  _product_code := CASE _product
    WHEN 'auto' THEN 'AUTO'
    WHEN 'voyage' THEN 'VOY'
    WHEN 'risques_divers' THEN 'RD'
  END;

  INSERT INTO public.contract_sequences (company_id, product_type, year, last_number)
  VALUES (_company_id, _product, _year, 1)
  ON CONFLICT (company_id, product_type, year)
  DO UPDATE SET last_number = contract_sequences.last_number + 1, updated_at = now()
  RETURNING last_number INTO _seq;

  RETURN upper(_company_code) || '-' || _product_code || '-' || _year::text || '-' || lpad(_seq::text, 5, '0');
END;
$$;

-- Trigger updated_at sur contract_sequences
CREATE TRIGGER trg_contract_sequences_updated_at
BEFORE UPDATE ON public.contract_sequences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger updated_at manquants (au cas où) sur tables existantes — skip si déjà présent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contracts_updated_at') THEN
    CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_updated_at') THEN
    CREATE TRIGGER trg_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;