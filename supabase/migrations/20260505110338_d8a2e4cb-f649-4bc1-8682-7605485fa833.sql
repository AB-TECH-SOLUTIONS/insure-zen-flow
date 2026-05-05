
-- 1. Étendre l'enum des rôles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'garage';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hopital';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacie';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'autorite';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reassureur';

-- 2. Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY dep_read ON public.departments FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR company_id IN (SELECT get_user_companies(auth.uid())) OR company_id = get_primary_company(auth.uid())
);
CREATE POLICY dep_write ON public.departments FOR ALL TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
) WITH CHECK (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
);
CREATE TRIGGER dep_upd BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Positions
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  level int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_read ON public.positions FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR company_id IN (SELECT get_user_companies(auth.uid())) OR company_id = get_primary_company(auth.uid())
);
CREATE POLICY pos_write ON public.positions FOR ALL TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
) WITH CHECK (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
);
CREATE TRIGGER pos_upd BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Team members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  manager_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  joined_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_read ON public.team_members FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR user_id = auth.uid() OR company_id IN (SELECT get_user_companies(auth.uid())) OR company_id = get_primary_company(auth.uid())
);
CREATE POLICY tm_write ON public.team_members FOR ALL TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
) WITH CHECK (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
);
CREATE TRIGGER tm_upd BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  email text NOT NULL,
  role app_role NOT NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_read_token ON public.invitations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY inv_write ON public.invitations FOR ALL TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR invited_by = auth.uid()
) WITH CHECK (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid())) OR invited_by = auth.uid()
);
CREATE TRIGGER inv_upd BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  company_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_read ON public.audit_logs FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'super_admin') OR (has_role(auth.uid(),'assureur') AND company_id = get_primary_company(auth.uid()))
);
CREATE POLICY al_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid());
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_company ON public.audit_logs(company_id);

-- 7. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  category text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_read ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'super_admin'));
CREATE POLICY notif_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_notif_user ON public.notifications(user_id, read_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
