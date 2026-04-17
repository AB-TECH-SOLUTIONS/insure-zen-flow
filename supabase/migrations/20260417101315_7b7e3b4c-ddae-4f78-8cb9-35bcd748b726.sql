-- ENUMS
CREATE TYPE public.app_role AS ENUM ('client', 'agent', 'courtier', 'assureur', 'super_admin');
CREATE TYPE public.quote_type AS ENUM ('auto', 'voyage', 'risques_divers');
CREATE TYPE public.quote_status AS ENUM ('brouillon', 'envoyee', 'acceptee', 'refusee', 'expiree');
CREATE TYPE public.contract_status AS ENUM ('actif', 'suspendu', 'resilie', 'expire');
CREATE TYPE public.claim_status AS ENUM ('declare', 'en_instruction', 'expertise', 'regle', 'refuse', 'clos');
CREATE TYPE public.payment_method AS ENUM ('mobile_money_mtn', 'mobile_money_orange', 'virement', 'especes', 'cheque', 'carte');
CREATE TYPE public.payment_status AS ENUM ('en_attente', 'paye', 'echoue', 'rembourse');
CREATE TYPE public.client_kind AS ENUM ('personne_physique', 'personne_morale');
CREATE TYPE public.broker_request_status AS ENUM ('en_attente', 'acceptee', 'refusee');

-- updated_at util
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT,
  primary_color TEXT DEFAULT '#0EA5E9',
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.companies (code, name, full_name, primary_color) VALUES
  ('NSIA', 'NSIA', 'NSIA Assurances', '#E30613'),
  ('GMC', 'GMC', 'GMC Assurances S.A.', '#1F4E79'),
  ('AFRI', 'AFRINSURANCE', 'Afrinsurance', '#0E8A57');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  primary_company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- BROKER WORKFLOW
CREATE TABLE public.broker_company_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status public.broker_request_status NOT NULL DEFAULT 'en_attente',
  justification TEXT,
  document_url TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_user_id, company_id)
);
ALTER TABLE public.broker_company_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bcr_updated BEFORE UPDATE ON public.broker_company_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.broker_company_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_user_id, company_id)
);
ALTER TABLE public.broker_company_access ENABLE ROW LEVEL SECURITY;

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.client_kind NOT NULL DEFAULT 'personne_physique',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  date_of_birth DATE,
  profession TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clients_owner ON public.clients(owner_user_id);
CREATE INDEX idx_clients_user ON public.clients(client_user_id);
CREATE INDEX idx_clients_company ON public.clients(company_id);

-- VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  registration TEXT,
  brand TEXT,
  model TEXT,
  first_registration_date DATE,
  fiscal_power INT,
  category TEXT,
  usage TEXT,
  energy TEXT,
  seats INT,
  payload_kg INT,
  new_value NUMERIC(14,2),
  market_value NUMERIC(14,2),
  vin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUOTES
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('Q-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  type public.quote_type NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'brouillon',
  company_id UUID NOT NULL REFERENCES public.companies(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  manual_mode BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  manual_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_premium NUMERIC(14,2),
  taxes NUMERIC(14,2),
  total_premium NUMERIC(14,2),
  start_date DATE,
  end_date DATE,
  duration_days INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_quotes_company ON public.quotes(company_id);
CREATE INDEX idx_quotes_creator ON public.quotes(created_by);
CREATE INDEX idx_quotes_client ON public.quotes(client_id);

-- CONTRACTS
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL UNIQUE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  type public.quote_type NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'actif',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_premium NUMERIC(14,2) NOT NULL,
  attestation_number TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_contracts_company ON public.contracts(company_id);
CREATE INDEX idx_contracts_client ON public.contracts(client_id);

-- CLAIMS
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT NOT NULL UNIQUE DEFAULT ('S-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  status public.claim_status NOT NULL DEFAULT 'declare',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_amount NUMERIC(14,2),
  settled_amount NUMERIC(14,2),
  declared_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  amount NUMERIC(14,2) NOT NULL,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'en_attente',
  external_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ATTESTATIONS STOCK
CREATE TABLE public.attestations_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  assigned_to UUID REFERENCES auth.users(id),
  serial_start TEXT NOT NULL,
  serial_end TEXT NOT NULL,
  used_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attestations_stock ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_att_updated BEFORE UPDATE ON public.attestations_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  related_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  related_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- ============ FONCTIONS UTILITAIRES (après création des tables) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_primary_company(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT primary_company_id FROM public.profiles WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT primary_company_id FROM public.profiles
    WHERE user_id = _user_id AND primary_company_id IS NOT NULL
  UNION
  SELECT company_id FROM public.broker_company_access
    WHERE broker_user_id = _user_id AND is_active = true
$$;

-- TRIGGER : nouveau user → profil + rôle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client'::public.app_role)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read_all" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_admin_all" ON public.companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "bcr_read" ON public.broker_company_requests FOR SELECT TO authenticated USING (
  broker_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);
CREATE POLICY "bcr_insert" ON public.broker_company_requests FOR INSERT TO authenticated WITH CHECK (
  broker_user_id = auth.uid() AND public.has_role(auth.uid(), 'courtier')
);
CREATE POLICY "bcr_update" ON public.broker_company_requests FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);

CREATE POLICY "bca_read" ON public.broker_company_access FOR SELECT TO authenticated USING (
  broker_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);
CREATE POLICY "bca_write" ON public.broker_company_access FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  );

CREATE POLICY "clients_read" ON public.clients FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR client_user_id = auth.uid()
  OR owner_user_id = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'assureur')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'courtier')
  OR (public.has_role(auth.uid(), 'client') AND client_user_id = auth.uid())
);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR client_user_id = auth.uid()
  OR owner_user_id = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);

CREATE POLICY "vehicles_read" ON public.vehicles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = vehicles.client_id AND (
    public.has_role(auth.uid(), 'super_admin')
    OR c.client_user_id = auth.uid() OR c.owner_user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'assureur') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND c.company_id IN (SELECT public.get_user_companies(auth.uid())))
  ))
);
CREATE POLICY "vehicles_write" ON public.vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = vehicles.client_id AND (
    public.has_role(auth.uid(), 'super_admin')
    OR c.client_user_id = auth.uid() OR c.owner_user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'assureur') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND c.company_id IN (SELECT public.get_user_companies(auth.uid())))
  )))
  WITH CHECK (true);

CREATE POLICY "quotes_read" ON public.quotes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = quotes.client_id AND c.client_user_id = auth.uid())
);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'assureur')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'courtier')
  OR public.has_role(auth.uid(), 'client')
);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (created_by = auth.uid() AND status = 'brouillon')
);

CREATE POLICY "contracts_read" ON public.contracts FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contracts.client_id AND c.client_user_id = auth.uid())
);
CREATE POLICY "contracts_write" ON public.contracts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  );

CREATE POLICY "claims_read" ON public.claims FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = claims.client_id AND c.client_user_id = auth.uid())
);
CREATE POLICY "claims_insert" ON public.claims FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'assureur')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'courtier')
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = claims.client_id AND c.client_user_id = auth.uid())
);
CREATE POLICY "claims_update" ON public.claims FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
);

CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
  OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = payments.client_id AND c.client_user_id = auth.uid())
);
CREATE POLICY "payments_write" ON public.payments FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = payments.client_id AND c.client_user_id = auth.uid())
  )
  WITH CHECK (true);

CREATE POLICY "att_read" ON public.attestations_stock FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR assigned_to = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);
CREATE POLICY "att_write" ON public.attestations_stock FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  );

CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "messages_send" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('quote-documents', 'quote-documents', false),
  ('claim-documents', 'claim-documents', false),
  ('contracts-pdf', 'contracts-pdf', false),
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "logos_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'company-logos' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "quote_docs_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'quote-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'assureur')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'courtier')
  )
);
CREATE POLICY "quote_docs_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'quote-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "claim_docs_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'claim-documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'assureur')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'courtier')
  )
);
CREATE POLICY "claim_docs_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'claim-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "contracts_pdf_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'contracts-pdf' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'assureur')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'courtier')
  )
);
CREATE POLICY "contracts_pdf_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'contracts-pdf' AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'assureur')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'courtier')
  )
);