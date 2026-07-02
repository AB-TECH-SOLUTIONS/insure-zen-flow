
-- ─── ENUMS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.tarif_produit AS ENUM ('auto','voyage','vie','gmc','risques_divers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tarif_base_calcul AS ENUM ('valeur_neuve','valeur_venale','prime_rc','forfait');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tarif_usage_dta AS ENUM ('transport_commun','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.partenaire_type AS ENUM ('hopital','clinique','pharmacie','garage','expert','centre_expertise','laboratoire');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper is_admin (super_admin uniquement — pas d'app_role 'admin')
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT public.has_role(_user_id,'super_admin'::app_role) $$;

-- ─── RÉFÉRENTIELS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pays_cima (
  code TEXT PRIMARY KEY, nom TEXT NOT NULL,
  devise TEXT NOT NULL DEFAULT 'XAF', tva_taux NUMERIC(5,4) NOT NULL DEFAULT 0.1925,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pays_cima TO authenticated, anon;
GRANT ALL ON public.pays_cima TO service_role;
ALTER TABLE public.pays_cima ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pays_read_all" ON public.pays_cima FOR SELECT USING (true);
CREATE POLICY "pays_admin_write" ON public.pays_cima FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pays_code TEXT NOT NULL REFERENCES public.pays_cima(code) ON DELETE CASCADE,
  code TEXT NOT NULL, nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pays_code, code)
);
GRANT SELECT ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions_read" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "regions_admin" ON public.regions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.villes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL, zone_cema TEXT NOT NULL DEFAULT 'A' CHECK (zone_cema IN ('A','B','C')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.villes TO authenticated;
GRANT ALL ON public.villes TO service_role;
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "villes_read" ON public.villes FOR SELECT TO authenticated USING (true);
CREATE POLICY "villes_admin" ON public.villes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─── TARIFS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tarif_bareme_rc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  produit public.tarif_produit NOT NULL, categorie TEXT NOT NULL,
  cv_min INTEGER, cv_max INTEGER, places_max INTEGER,
  ptac_max_kg INTEGER, cu_max_kg INTEGER,
  prime_annuelle NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tarif_bareme_rc (country_code, produit, categorie, actif, date_effet DESC);
GRANT SELECT ON public.tarif_bareme_rc TO authenticated;
GRANT ALL ON public.tarif_bareme_rc TO service_role;
ALTER TABLE public.tarif_bareme_rc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_read" ON public.tarif_bareme_rc FOR SELECT TO authenticated USING (true);
CREATE POLICY "rc_admin" ON public.tarif_bareme_rc FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_taux_garantie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  produit public.tarif_produit NOT NULL, categorie TEXT NOT NULL,
  code_garantie TEXT NOT NULL, label TEXT NOT NULL,
  base_calcul public.tarif_base_calcul NOT NULL, taux NUMERIC(8,6) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tarif_taux_garantie (country_code, produit, categorie, code_garantie, actif);
GRANT SELECT ON public.tarif_taux_garantie TO authenticated;
GRANT ALL ON public.tarif_taux_garantie TO service_role;
ALTER TABLE public.tarif_taux_garantie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tg_read" ON public.tarif_taux_garantie FOR SELECT TO authenticated USING (true);
CREATE POLICY "tg_admin" ON public.tarif_taux_garantie FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_dta_vignette (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  usage public.tarif_usage_dta NOT NULL,
  cv_min INTEGER NOT NULL, cv_max INTEGER NOT NULL, montant NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_dta_vignette TO authenticated;
GRANT ALL ON public.tarif_dta_vignette TO service_role;
ALTER TABLE public.tarif_dta_vignette ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dta_read" ON public.tarif_dta_vignette FOR SELECT TO authenticated USING (true);
CREATE POLICY "dta_admin" ON public.tarif_dta_vignette FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_accessoires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  prime_nette_min NUMERIC(14,2) NOT NULL, prime_nette_max NUMERIC(14,2) NOT NULL,
  montant NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_accessoires TO authenticated;
GRANT ALL ON public.tarif_accessoires TO service_role;
ALTER TABLE public.tarif_accessoires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acc_read" ON public.tarif_accessoires FOR SELECT TO authenticated USING (true);
CREATE POLICY "acc_admin" ON public.tarif_accessoires FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_options_ipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  code TEXT NOT NULL, label TEXT NOT NULL,
  capital_deces NUMERIC(14,2) NOT NULL, capital_invalidite NUMERIC(14,2) NOT NULL,
  frais_medicaux NUMERIC(14,2) NOT NULL, prime_par_place NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_options_ipt TO authenticated;
GRANT ALL ON public.tarif_options_ipt TO service_role;
ALTER TABLE public.tarif_options_ipt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ipt_read" ON public.tarif_options_ipt FOR SELECT TO authenticated USING (true);
CREATE POLICY "ipt_admin" ON public.tarif_options_ipt FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_frais_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  code TEXT NOT NULL, label TEXT NOT NULL, montant NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_frais_fixes TO authenticated;
GRANT ALL ON public.tarif_frais_fixes TO service_role;
ALTER TABLE public.tarif_frais_fixes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_read" ON public.tarif_frais_fixes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ff_admin" ON public.tarif_frais_fixes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_reductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  code TEXT NOT NULL, label TEXT NOT NULL,
  taux_max NUMERIC(6,4) NOT NULL, plafond NUMERIC(14,2),
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_reductions TO authenticated;
GRANT ALL ON public.tarif_reductions TO service_role;
ALTER TABLE public.tarif_reductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "red_read" ON public.tarif_reductions FOR SELECT TO authenticated USING (true);
CREATE POLICY "red_admin" ON public.tarif_reductions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_voyage_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  zone_code TEXT NOT NULL, label TEXT NOT NULL,
  coefficient NUMERIC(6,4) NOT NULL DEFAULT 1, actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_voyage_zones TO authenticated;
GRANT ALL ON public.tarif_voyage_zones TO service_role;
ALTER TABLE public.tarif_voyage_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vz_read" ON public.tarif_voyage_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "vz_admin" ON public.tarif_voyage_zones FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_voyage_bareme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  zone_code TEXT NOT NULL,
  duree_min INTEGER NOT NULL, duree_max INTEGER NOT NULL,
  age_min INTEGER NOT NULL, age_max INTEGER NOT NULL,
  prime NUMERIC(14,2) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tarif_voyage_bareme (country_code, zone_code, actif);
GRANT SELECT ON public.tarif_voyage_bareme TO authenticated;
GRANT ALL ON public.tarif_voyage_bareme TO service_role;
ALTER TABLE public.tarif_voyage_bareme ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vb_read" ON public.tarif_voyage_bareme FOR SELECT TO authenticated USING (true);
CREATE POLICY "vb_admin" ON public.tarif_voyage_bareme FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_vie_bareme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  age_min INTEGER NOT NULL, age_max INTEGER NOT NULL,
  taux_annuel NUMERIC(8,6) NOT NULL,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_vie_bareme TO authenticated;
GRANT ALL ON public.tarif_vie_bareme TO service_role;
ALTER TABLE public.tarif_vie_bareme ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vie_read" ON public.tarif_vie_bareme FOR SELECT TO authenticated USING (true);
CREATE POLICY "vie_admin" ON public.tarif_vie_bareme FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_vie_periodicites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  code TEXT NOT NULL, label TEXT NOT NULL,
  diviseur INTEGER NOT NULL, majoration NUMERIC(6,4) NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_vie_periodicites TO authenticated;
GRANT ALL ON public.tarif_vie_periodicites TO service_role;
ALTER TABLE public.tarif_vie_periodicites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_read" ON public.tarif_vie_periodicites FOR SELECT TO authenticated USING (true);
CREATE POLICY "vp_admin" ON public.tarif_vie_periodicites FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.tarif_gmc_bareme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.pays_cima(code),
  formule TEXT NOT NULL,
  age_min INTEGER NOT NULL, age_max INTEGER NOT NULL,
  prime_annuelle NUMERIC(14,2) NOT NULL, plafond_annuel NUMERIC(14,2) NOT NULL,
  ticket_moderateur NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  date_effet DATE NOT NULL DEFAULT CURRENT_DATE, date_fin DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tarif_gmc_bareme TO authenticated;
GRANT ALL ON public.tarif_gmc_bareme TO service_role;
ALTER TABLE public.tarif_gmc_bareme ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gmc_read" ON public.tarif_gmc_bareme FOR SELECT TO authenticated USING (true);
CREATE POLICY "gmc_admin" ON public.tarif_gmc_bareme FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─── PARTENAIRES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partenaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.partenaire_type NOT NULL,
  nom TEXT NOT NULL, code TEXT, agrement_num TEXT,
  telephone TEXT, email TEXT, adresse TEXT,
  ville_id UUID REFERENCES public.villes(id),
  pays_code TEXT NOT NULL DEFAULT 'CM' REFERENCES public.pays_cima(code),
  specialites JSONB DEFAULT '[]'::jsonb,
  tarifs_conventionnes JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT, actif BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.partenaires (type, actif, pays_code);
GRANT SELECT ON public.partenaires TO authenticated;
GRANT ALL ON public.partenaires TO service_role;
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "part_read" ON public.partenaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "part_admin" ON public.partenaires FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─── APP SETTINGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY, value JSONB NOT NULL,
  description TEXT, country_code TEXT REFERENCES public.pays_cima(code),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─── TRIGGERS updated_at ───────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pays_cima','regions','villes',
    'tarif_bareme_rc','tarif_taux_garantie','tarif_dta_vignette','tarif_accessoires',
    'tarif_options_ipt','tarif_frais_fixes','tarif_reductions',
    'tarif_voyage_zones','tarif_voyage_bareme','tarif_vie_bareme','tarif_vie_periodicites',
    'tarif_gmc_bareme','partenaires','app_settings'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_upd ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_upd BEFORE UPDATE ON public.%1$s
                    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- ─── SEED ──────────────────────────────────────────────────────────────────
INSERT INTO public.pays_cima (code,nom,devise,tva_taux) VALUES
  ('BJ','Bénin','XOF',0.18),('BF','Burkina Faso','XOF',0.18),
  ('CM','Cameroun','XAF',0.1925),('CF','République Centrafricaine','XAF',0.19),
  ('KM','Comores','KMF',0.10),('CG','Congo','XAF',0.18),
  ('CI','Côte d''Ivoire','XOF',0.18),('GA','Gabon','XAF',0.18),
  ('GQ','Guinée Équatoriale','XAF',0.15),('GW','Guinée-Bissau','XOF',0.15),
  ('ML','Mali','XOF',0.18),('NE','Niger','XOF',0.19),
  ('SN','Sénégal','XOF',0.18),('TD','Tchad','XAF',0.18)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.regions (pays_code,code,nom) VALUES
  ('CM','AD','Adamaoua'),('CM','CE','Centre'),('CM','ES','Est'),
  ('CM','EN','Extrême-Nord'),('CM','LT','Littoral'),('CM','NO','Nord'),
  ('CM','NW','Nord-Ouest'),('CM','OU','Ouest'),('CM','SU','Sud'),('CM','SW','Sud-Ouest')
ON CONFLICT (pays_code,code) DO NOTHING;

INSERT INTO public.villes (region_id, nom, zone_cema)
SELECT r.id, v.nom, v.zone FROM public.regions r
JOIN (VALUES
  ('CE','Yaoundé','A'),('LT','Douala','A'),('NW','Bamenda','B'),
  ('OU','Bafoussam','B'),('SW','Buea','B'),('NO','Garoua','B'),
  ('EN','Maroua','C'),('AD','Ngaoundéré','C'),('ES','Bertoua','C'),('SU','Ebolowa','B')
) v(rcode, nom, zone) ON r.code = v.rcode AND r.pays_code='CM';

INSERT INTO public.tarif_bareme_rc (country_code,produit,categorie,cv_min,cv_max,prime_annuelle) VALUES
  ('CM','auto','cat1',2,6,47252),('CM','auto','cat1',7,10,70877),
  ('CM','auto','cat1',11,14,117764),('CM','auto','cat1',15,23,170005),
  ('CM','auto','cat1',24,999,177733);

INSERT INTO public.tarif_bareme_rc (country_code,produit,categorie,cu_max_kg,prime_annuelle) VALUES
  ('CM','auto','cat2',1500,90000),('CM','auto','cat2',3500,130000),
  ('CM','auto','cat2',6000,180000),('CM','auto','cat2',999999,250000);

INSERT INTO public.tarif_bareme_rc (country_code,produit,categorie,ptac_max_kg,prime_annuelle) VALUES
  ('CM','auto','cat3',3500,200000),('CM','auto','cat3',10000,350000),
  ('CM','auto','cat3',19000,500000),('CM','auto','cat3',999999,750000);

INSERT INTO public.tarif_bareme_rc (country_code,produit,categorie,places_max,prime_annuelle) VALUES
  ('CM','auto','cat4a',9,150000),('CM','auto','cat4b',20,280000),
  ('CM','auto','cat4b',50,450000),('CM','auto','cat4c',999,700000);

INSERT INTO public.tarif_bareme_rc (country_code,produit,categorie,prime_annuelle) VALUES
  ('CM','auto','cat5',18000),('CM','auto','cat7',95000),('CM','auto','cat8',130000),
  ('CM','auto','cat6',100000),('CM','auto','cat9',100000),('CM','auto','cat11',100000);

INSERT INTO public.tarif_taux_garantie (country_code,produit,categorie,code_garantie,label,base_calcul,taux) VALUES
  ('CM','auto','cat1','dommages','Dommages tous accidents','valeur_venale',0.035),
  ('CM','auto','cat1','bris_glaces','Bris de glaces','valeur_neuve',0.003),
  ('CM','auto','cat1','incendie','Incendie','valeur_venale',0.0024),
  ('CM','auto','cat1','vol_simple','Vol simple','valeur_venale',0.01),
  ('CM','auto','cat1','vol_braquage','Vol braquage','valeur_venale',0.005),
  ('CM','auto','cat1','tierce_collision','Tierce collision','valeur_venale',0.025),
  ('CM','auto','cat2','dommages','Dommages','valeur_venale',0.05),
  ('CM','auto','cat2','bris_glaces','Bris de glaces','valeur_neuve',0.004),
  ('CM','auto','cat2','incendie','Incendie','valeur_venale',0.0024),
  ('CM','auto','cat2','vol_simple','Vol simple','valeur_venale',0.01),
  ('CM','auto','cat2','vol_braquage','Vol braquage','valeur_venale',0.005),
  ('CM','auto','cat2','tierce_collision','Tierce collision','valeur_venale',0.02),
  ('CM','auto','cat3','dommages','Dommages','valeur_venale',0.04),
  ('CM','auto','cat3','bris_glaces','Bris de glaces','valeur_neuve',0.004),
  ('CM','auto','cat3','incendie','Incendie','valeur_venale',0.003),
  ('CM','auto','cat3','vol_simple','Vol simple','valeur_venale',0.015),
  ('CM','auto','cat3','vol_braquage','Vol braquage','valeur_venale',0.005),
  ('CM','auto','cat3','tierce_collision','Tierce collision','valeur_venale',0.02),
  ('CM','auto','cat4a','dommages','Dommages','valeur_venale',0.06),
  ('CM','auto','cat4a','bris_glaces','Bris de glaces','valeur_neuve',0.005),
  ('CM','auto','cat4a','incendie','Incendie','valeur_venale',0.003),
  ('CM','auto','cat4a','vol_simple','Vol simple','valeur_venale',0.015),
  ('CM','auto','cat4a','vol_braquage','Vol braquage','valeur_venale',0.005),
  ('CM','auto','cat4a','tierce_collision','Tierce collision','valeur_venale',0.025);

INSERT INTO public.tarif_dta_vignette (country_code,usage,cv_min,cv_max,montant) VALUES
  ('CM','transport_commun',2,7,15000),('CM','transport_commun',8,13,25000),
  ('CM','transport_commun',14,20,50000),('CM','transport_commun',21,999,150000),
  ('CM','autre',2,7,20000),('CM','autre',8,13,50000),
  ('CM','autre',14,20,75000),('CM','autre',21,999,200000);

INSERT INTO public.tarif_accessoires (country_code,prime_nette_min,prime_nette_max,montant) VALUES
  ('CM',0,99999,5000),('CM',100000,299999,10000),('CM',300000,499999,15000),
  ('CM',500000,999999,25000),('CM',1000000,999999999,35000);

INSERT INTO public.tarif_options_ipt (country_code,code,label,capital_deces,capital_invalidite,frais_medicaux,prime_par_place) VALUES
  ('CM','I','Option I — Standard',1000000,1000000,100000,1500),
  ('CM','II','Option II — Confort',2000000,2000000,200000,3000),
  ('CM','III','Option III — Premium',5000000,5000000,500000,7500),
  ('CM','IV','Option IV — Excellence',10000000,10000000,1000000,15000);

INSERT INTO public.tarif_frais_fixes (country_code,code,label,montant) VALUES
  ('CM','fichier_central','Fichier central',2000),
  ('CM','carte_rose_cemac','Carte Rose CEMAC',1000),
  ('CM','defense_recours','Défense & Recours (forfait)',2000),
  ('CM','protection_conducteur_min','Protection conducteur minimum',26250);

INSERT INTO public.tarif_reductions (country_code,code,label,taux_max) VALUES
  ('CM','flotte','Réduction flotte',0.15),
  ('CM','fidelite','Réduction fidélité',0.10),
  ('CM','sans_sinistre','Bonus sans sinistre',0.15);

INSERT INTO public.tarif_voyage_zones (country_code,zone_code,label,coefficient) VALUES
  ('CM','SCHENGEN','Espace Schengen',1.0),
  ('CM','MONDE','Monde entier',1.5),
  ('CM','AFRIQUE','Afrique',0.8),
  ('CM','USA_CANADA','USA / Canada',1.8);

INSERT INTO public.tarif_voyage_bareme (country_code,zone_code,duree_min,duree_max,age_min,age_max,prime) VALUES
  ('CM','SCHENGEN',1,7,0,64,15000),('CM','SCHENGEN',8,15,0,64,25000),
  ('CM','SCHENGEN',16,30,0,64,40000),('CM','SCHENGEN',31,90,0,64,80000),
  ('CM','SCHENGEN',1,90,65,120,120000),
  ('CM','MONDE',1,7,0,64,25000),('CM','MONDE',8,30,0,64,60000),
  ('CM','AFRIQUE',1,30,0,64,12000);

INSERT INTO public.tarif_vie_bareme (country_code,age_min,age_max,taux_annuel) VALUES
  ('CM',18,30,0.008),('CM',31,40,0.012),('CM',41,50,0.020),
  ('CM',51,60,0.035),('CM',61,70,0.060);

INSERT INTO public.tarif_vie_periodicites (country_code,code,label,diviseur,majoration) VALUES
  ('CM','annuel','Annuel',1,0),('CM','semestriel','Semestriel',2,0.02),
  ('CM','trimestriel','Trimestriel',4,0.04),('CM','mensuel','Mensuel',12,0.05);

INSERT INTO public.tarif_gmc_bareme (country_code,formule,age_min,age_max,prime_annuelle,plafond_annuel) VALUES
  ('CM','essentielle',0,17,60000,1500000),('CM','essentielle',18,59,90000,1500000),
  ('CM','essentielle',60,120,180000,1500000),
  ('CM','confort',0,17,120000,3000000),('CM','confort',18,59,180000,3000000),
  ('CM','confort',60,120,350000,3000000),
  ('CM','premium',0,17,240000,6000000),('CM','premium',18,59,360000,6000000),
  ('CM','premium',60,120,700000,6000000);

INSERT INTO public.app_settings (key,value,description) VALUES
  ('numerotation_format','"{COMPANY}-{TYPE}-{PRODUCT}-{YYYY}-{NNNNN}"','Format de numérotation des contrats CIMA'),
  ('delai_attestation_provisoire_jours','30','Durée max attestation provisoire (Art. 222)'),
  ('delai_attestation_definitive_jours','15','Délai émission attestation définitive après paiement (Art. 216)'),
  ('verrou_art13_actif','true','Verrou paiement obligatoire avant activation contrat (Art. 13)'),
  ('duree_validite_devis_jours','30','Durée de validité par défaut d''un devis'),
  ('pays_defaut','"CM"','Pays par défaut de l''instance')
ON CONFLICT (key) DO NOTHING;
