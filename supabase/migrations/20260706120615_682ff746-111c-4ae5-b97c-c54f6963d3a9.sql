
DO $$
DECLARE
  _nsia UUID := (SELECT id FROM public.companies WHERE code = 'NSIA');
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    'tarif_bareme_rc','tarif_taux_garantie','tarif_dta_vignette',
    'tarif_options_ipt','tarif_frais_fixes','tarif_reductions',
    'tarif_accessoires','tarif_voyage_bareme','tarif_voyage_zones',
    'tarif_vie_bareme','tarif_vie_periodicites','tarif_gmc_bareme'
  ];
BEGIN
  IF _nsia IS NULL THEN RAISE EXCEPTION 'NSIA introuvable'; END IF;
  FOREACH _tbl IN ARRAY _tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE', _tbl);
    EXECUTE format('UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL', _tbl) USING _nsia;
  END LOOP;
END $$;

DO $$
DECLARE
  _nsia UUID := (SELECT id FROM public.companies WHERE code = 'NSIA');
  _target UUID;
  _codes TEXT[] := ARRAY['AFRI','GMC'];
  _code TEXT;
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    'tarif_bareme_rc','tarif_taux_garantie','tarif_dta_vignette',
    'tarif_options_ipt','tarif_frais_fixes','tarif_reductions',
    'tarif_accessoires','tarif_voyage_bareme','tarif_voyage_zones',
    'tarif_vie_bareme','tarif_vie_periodicites','tarif_gmc_bareme'
  ];
  _cols TEXT;
BEGIN
  FOREACH _code IN ARRAY _codes LOOP
    _target := (SELECT id FROM public.companies WHERE code = _code);
    IF _target IS NULL THEN CONTINUE; END IF;
    FOREACH _tbl IN ARRAY _tables LOOP
      SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO _cols
        FROM information_schema.columns
       WHERE table_schema='public' AND table_name=_tbl
         AND column_name NOT IN ('id','created_at','updated_at','company_id','created_by');
      EXECUTE format(
        'INSERT INTO public.%I (%s, company_id) SELECT %s, %L::uuid FROM public.%I WHERE company_id = %L::uuid',
        _tbl, _cols, _cols, _target, _tbl, _nsia
      );
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE
  _gmc UUID := (SELECT id FROM public.companies WHERE code = 'GMC');
BEGIN
  IF _gmc IS NULL THEN RETURN; END IF;

  DELETE FROM public.tarif_dta_vignette WHERE company_id = _gmc;
  INSERT INTO public.tarif_dta_vignette (company_id, country_code, usage, cv_min, cv_max, montant, date_effet, actif) VALUES
    (_gmc,'CM','transport_commun',2,7,30000,'2020-01-01',true),
    (_gmc,'CM','transport_commun',8,13,50000,'2020-01-01',true),
    (_gmc,'CM','transport_commun',14,20,75000,'2020-01-01',true),
    (_gmc,'CM','transport_commun',21,999,200000,'2020-01-01',true),
    (_gmc,'CM','autre',2,7,30000,'2020-01-01',true),
    (_gmc,'CM','autre',8,13,50000,'2020-01-01',true),
    (_gmc,'CM','autre',14,20,75000,'2020-01-01',true),
    (_gmc,'CM','autre',21,999,200000,'2020-01-01',true);

  DELETE FROM public.tarif_taux_garantie WHERE company_id = _gmc AND categorie IN ('cat1','cat2') AND produit = 'auto';
  INSERT INTO public.tarif_taux_garantie (company_id, country_code, produit, categorie, code_garantie, label, base_calcul, taux, date_effet, actif)
  SELECT _gmc, 'CM', 'auto'::tarif_produit, v.cat, v.code, v.lbl, v.base::tarif_base_calcul, v.taux, '2020-01-01', true
  FROM (VALUES
    ('cat1','dommages','Dommages Tous Accidents','valeur_venale',0.035),
    ('cat1','bris_de_glaces','Bris de Glaces','valeur_venale',0.005),
    ('cat1','incendie','Incendie','valeur_venale',0.0025),
    ('cat1','vol_simple','Vol simple','valeur_venale',0.01),
    ('cat1','vol_braquage','Vol / Braquage','valeur_venale',0.01),
    ('cat1','tierce_collision','Tierce collision','valeur_venale',0.025),
    ('cat2','dommages','Dommages Tous Accidents','valeur_venale',0.035),
    ('cat2','bris_de_glaces','Bris de Glaces','valeur_venale',0.005),
    ('cat2','incendie','Incendie','valeur_venale',0.0025),
    ('cat2','vol_simple','Vol simple','valeur_venale',0.01),
    ('cat2','vol_braquage','Vol / Braquage','valeur_venale',0.01),
    ('cat2','tierce_collision','Tierce collision','valeur_venale',0.025)
  ) v(cat, code, lbl, base, taux);
END $$;

DO $$
DECLARE
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    'tarif_bareme_rc','tarif_taux_garantie','tarif_dta_vignette',
    'tarif_options_ipt','tarif_frais_fixes','tarif_reductions',
    'tarif_accessoires','tarif_voyage_bareme','tarif_voyage_zones',
    'tarif_vie_bareme','tarif_vie_periodicites','tarif_gmc_bareme'
  ];
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', _tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id, country_code, actif)',
                   _tbl || '_company_idx', _tbl);
  END LOOP;
END $$;
