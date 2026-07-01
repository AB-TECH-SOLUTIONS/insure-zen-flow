
-- 1. INVITATIONS
DROP POLICY IF EXISTS inv_read_token ON public.invitations;
DROP POLICY IF EXISTS inv_read_scoped ON public.invitations;
CREATE POLICY inv_read_scoped ON public.invitations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR invited_by = auth.uid()
  OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  id uuid, email text, role app_role, company_id uuid, position_id uuid,
  status text, expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.email, i.role, i.company_id, i.position_id,
         i.status, i.expires_at
  FROM public.invitations i
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_inv FROM public.invitations
   WHERE token = _token AND status = 'pending' AND expires_at > now()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_invalid'; END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (v_uid, v_inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_inv.company_id IS NOT NULL THEN
    UPDATE public.profiles SET primary_company_id = v_inv.company_id
     WHERE user_id = v_uid AND primary_company_id IS NULL;
    INSERT INTO public.team_members(company_id, user_id, position_id)
    VALUES (v_inv.company_id, v_uid, v_inv.position_id)
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;

  UPDATE public.invitations
     SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
   WHERE id = v_inv.id;

  RETURN jsonb_build_object('role', v_inv.role, 'company_id', v_inv.company_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- 2. PROFILES
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (has_role(auth.uid(), 'agent'::app_role)
     OR has_role(auth.uid(), 'assureur'::app_role)
     OR has_role(auth.uid(), 'courtier'::app_role))
    AND primary_company_id IS NOT NULL
    AND primary_company_id = get_primary_company(auth.uid())
  )
);

-- 3. AVENANTS
DROP POLICY IF EXISTS avenants_write ON public.avenants;
CREATE POLICY avenants_write ON public.avenants
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.contracts ct
     WHERE ct.id = avenants.contract_id
       AND ct.company_id = get_primary_company(auth.uid())
       AND (has_role(auth.uid(), 'agent'::app_role)
            OR has_role(auth.uid(), 'assureur'::app_role)
            OR has_role(auth.uid(), 'courtier'::app_role))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.contracts ct
     WHERE ct.id = avenants.contract_id
       AND ct.company_id = get_primary_company(auth.uid())
       AND (has_role(auth.uid(), 'agent'::app_role)
            OR has_role(auth.uid(), 'assureur'::app_role)
            OR has_role(auth.uid(), 'courtier'::app_role))
  )
);

-- 4. NOTIFICATIONS
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 5. BORDEREAUX
DROP POLICY IF EXISTS bordereaux_rw ON public.bordereaux;
CREATE POLICY bordereaux_rw ON public.bordereaux
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (has_role(auth.uid(), 'assureur'::app_role)
     OR has_role(auth.uid(), 'agent'::app_role)
     OR has_role(auth.uid(), 'courtier'::app_role))
    AND company_id = get_primary_company(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (has_role(auth.uid(), 'assureur'::app_role)
     OR has_role(auth.uid(), 'agent'::app_role)
     OR has_role(auth.uid(), 'courtier'::app_role))
    AND company_id = get_primary_company(auth.uid())
  )
);

-- 6. STORAGE (5 buckets métier)
DROP POLICY IF EXISTS expertise_docs_rw ON storage.objects;
DROP POLICY IF EXISTS garage_docs_rw    ON storage.objects;
DROP POLICY IF EXISTS hopital_docs_rw   ON storage.objects;
DROP POLICY IF EXISTS pharmacie_docs_rw ON storage.objects;
DROP POLICY IF EXISTS autorite_docs_rw  ON storage.objects;

CREATE POLICY expertise_docs_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='expertise-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'expert'::app_role)
  OR has_role(auth.uid(),'assureur'::app_role)
  OR has_role(auth.uid(),'agent'::app_role)
  OR has_role(auth.uid(),'courtier'::app_role)));
CREATE POLICY expertise_docs_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='expertise-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'expert'::app_role)));
CREATE POLICY expertise_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='expertise-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY expertise_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='expertise-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY garage_docs_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='garage-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'garage'::app_role)
  OR has_role(auth.uid(),'assureur'::app_role)
  OR has_role(auth.uid(),'agent'::app_role)
  OR has_role(auth.uid(),'courtier'::app_role)));
CREATE POLICY garage_docs_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='garage-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'garage'::app_role)));
CREATE POLICY garage_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='garage-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY garage_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='garage-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY hopital_docs_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='hopital-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'hopital'::app_role)
  OR has_role(auth.uid(),'assureur'::app_role)));
CREATE POLICY hopital_docs_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='hopital-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'hopital'::app_role)));
CREATE POLICY hopital_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='hopital-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY hopital_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='hopital-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY pharmacie_docs_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='pharmacie-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'pharmacie'::app_role)
  OR has_role(auth.uid(),'assureur'::app_role)));
CREATE POLICY pharmacie_docs_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='pharmacie-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'pharmacie'::app_role)));
CREATE POLICY pharmacie_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='pharmacie-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY pharmacie_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='pharmacie-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));

CREATE POLICY autorite_docs_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='autorite-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'autorite'::app_role)
  OR has_role(auth.uid(),'assureur'::app_role)));
CREATE POLICY autorite_docs_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='autorite-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)
  OR has_role(auth.uid(),'autorite'::app_role)));
CREATE POLICY autorite_docs_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='autorite-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));
CREATE POLICY autorite_docs_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='autorite-documents' AND (
  (auth.uid())::text = (storage.foldername(name))[1]
  OR has_role(auth.uid(),'super_admin'::app_role)));

-- 7. REALTIME
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_own_topic_read"  ON realtime.messages;
DROP POLICY IF EXISTS "authenticated_own_topic_write" ON realtime.messages;
CREATE POLICY "authenticated_own_topic_read" ON realtime.messages
FOR SELECT TO authenticated
USING (realtime.topic() = ('user:' || (auth.uid())::text));
CREATE POLICY "authenticated_own_topic_write" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (realtime.topic() = ('user:' || (auth.uid())::text));

-- 8. FONCTIONS
ALTER FUNCTION public.audit_logs_immutable() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_companies(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.next_contract_number(uuid, quote_type) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_claim_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_contract_number(uuid, quote_type) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.next_contract_number(uuid, quote_type) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.get_primary_company(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_primary_company(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_user_companies(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_companies(uuid) TO authenticated;
