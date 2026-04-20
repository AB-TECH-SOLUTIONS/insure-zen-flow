-- 1) Companies readable to anonymous users (for signup form)
DROP POLICY IF EXISTS companies_read_all ON public.companies;
CREATE POLICY companies_read_all ON public.companies
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2) Client documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Table to store document metadata + extracted JSON
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('carte_grise','permis','passeport','cni','autre')),
  storage_path text NOT NULL,
  mime_type text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_documents_read ON public.client_documents
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_documents.client_id
        AND (
          c.client_user_id = auth.uid()
          OR c.owner_user_id = auth.uid()
          OR (has_role(auth.uid(),'agent'::app_role) AND c.company_id = get_primary_company(auth.uid()))
          OR (has_role(auth.uid(),'assureur'::app_role) AND c.company_id = get_primary_company(auth.uid()))
          OR (has_role(auth.uid(),'courtier'::app_role) AND c.company_id IN (SELECT get_user_companies(auth.uid())))
        )
    )
  );

CREATE POLICY client_documents_insert ON public.client_documents
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY client_documents_update ON public.client_documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY client_documents_delete ON public.client_documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_client_documents_updated
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Storage policies for client-documents bucket
-- Path convention: <user_id>/<doc_type>/<filename>
CREATE POLICY client_docs_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR has_role(auth.uid(),'super_admin'::app_role)
      OR has_role(auth.uid(),'agent'::app_role)
      OR has_role(auth.uid(),'assureur'::app_role)
      OR has_role(auth.uid(),'courtier'::app_role)
    )
  );

CREATE POLICY client_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY client_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(),'super_admin'::app_role))
  );