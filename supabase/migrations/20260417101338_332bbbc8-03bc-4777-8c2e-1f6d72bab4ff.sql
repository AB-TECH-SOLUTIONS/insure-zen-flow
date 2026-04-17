-- 1. vehicles_write : scoper le WITH CHECK
DROP POLICY IF EXISTS "vehicles_write" ON public.vehicles;
CREATE POLICY "vehicles_write" ON public.vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = vehicles.client_id AND (
    public.has_role(auth.uid(), 'super_admin')
    OR c.client_user_id = auth.uid() OR c.owner_user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'assureur') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND c.company_id IN (SELECT public.get_user_companies(auth.uid())))
  )))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = vehicles.client_id AND (
    public.has_role(auth.uid(), 'super_admin')
    OR c.client_user_id = auth.uid() OR c.owner_user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'assureur') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND c.company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND c.company_id IN (SELECT public.get_user_companies(auth.uid())))
  )));

-- 2. payments_write : scoper le WITH CHECK
DROP POLICY IF EXISTS "payments_write" ON public.payments;
CREATE POLICY "payments_write" ON public.payments FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = payments.client_id AND c.client_user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
    OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
    OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = payments.client_id AND c.client_user_id = auth.uid())
  );

-- 3. avatars : limiter le SELECT aux utilisateurs authentifiés (URL directe reste publique)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');

-- 4. company-logos : idem, lecture aux authentifiés
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'company-logos');