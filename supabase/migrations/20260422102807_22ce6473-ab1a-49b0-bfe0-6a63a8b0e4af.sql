-- Enums pour priorité et statut des tâches
CREATE TYPE public.task_priority AS ENUM ('low', 'med', 'high');
CREATE TYPE public.task_status AS ENUM ('todo', 'wip', 'done', 'blocked');

-- Table des tâches
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'med',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_date date,
  difficulties text,
  observations text,
  assigned_to uuid,
  created_by uuid,
  related_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  related_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  related_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  related_claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);

-- Trigger updated_at
CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_read ON public.tasks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
);

CREATE POLICY tasks_insert ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'assureur')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'courtier')
);

CREATE POLICY tasks_update ON public.tasks
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND company_id = public.get_primary_company(auth.uid()))
  OR (public.has_role(auth.uid(), 'courtier') AND company_id IN (SELECT public.get_user_companies(auth.uid())))
);

CREATE POLICY tasks_delete ON public.tasks
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'assureur') AND company_id = public.get_primary_company(auth.uid()))
);

-- Realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;