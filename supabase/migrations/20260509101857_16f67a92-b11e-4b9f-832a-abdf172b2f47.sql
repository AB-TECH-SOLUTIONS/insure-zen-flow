-- Add 'vie' to quote_type for future life insurance branch
ALTER TYPE public.quote_type ADD VALUE IF NOT EXISTS 'vie';

-- Harden SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_primary_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT primary_company_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Tighten profiles SELECT
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'agent')
    OR public.has_role(auth.uid(), 'assureur')
    OR public.has_role(auth.uid(), 'courtier')
  );

-- Companies write restricted to super_admin (SELECT policy already exists)
DROP POLICY IF EXISTS companies_admin_all ON public.companies;
CREATE POLICY companies_write ON public.companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));