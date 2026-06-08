
-- Triggers d'audit immuables pour conformité CIMA
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _action TEXT;
  _resource TEXT := TG_ARGV[0];
  _rid UUID;
  _old JSONB;
  _new JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := _resource || '.created';
    _rid := (NEW).id;
    _old := NULL;
    _new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Pour contracts/claims/payments, on logue uniquement les changements de status
    IF _resource IN ('contract','claim','payment') THEN
      IF COALESCE((OLD).status::text,'') = COALESCE((NEW).status::text,'') THEN
        RETURN NEW;
      END IF;
      _action := _resource || '.status_changed';
    ELSE
      _action := _resource || '.updated';
    END IF;
    _rid := (NEW).id;
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    _action := _resource || '.deleted';
    _rid := (OLD).id;
    _old := to_jsonb(OLD);
    _new := NULL;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, old_value, new_value)
  VALUES (auth.uid(), _action, _resource, _rid, _old, _new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Bloque toute UPDATE/DELETE sur audit_logs (immutabilité CIMA)
CREATE OR REPLACE FUNCTION public.audit_logs_immutable()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs est immuable';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_no_modify ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_no_modify
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_logs_immutable();

DROP TRIGGER IF EXISTS trg_audit_contracts ON public.contracts;
CREATE TRIGGER trg_audit_contracts
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('contract');

DROP TRIGGER IF EXISTS trg_audit_claims ON public.claims;
CREATE TRIGGER trg_audit_claims
AFTER INSERT OR UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('claim');

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('payment');

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('user_role');
