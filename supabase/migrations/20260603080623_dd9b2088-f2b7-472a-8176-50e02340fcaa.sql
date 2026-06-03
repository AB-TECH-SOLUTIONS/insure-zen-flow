-- Table pour rate limiting ad-hoc des Edge Functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (bucket, identifier, window_start);

GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Seul service_role (utilisé par les Edge Functions) peut accéder
CREATE POLICY "rate_limits_admin_only"
ON public.rate_limits FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Fonction d'incrément atomique appelée par les Edge Functions (service_role)
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _bucket TEXT,
  _identifier TEXT,
  _max_per_minute INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _window TIMESTAMPTZ := date_trunc('minute', now());
  _current INTEGER;
BEGIN
  INSERT INTO public.rate_limits (bucket, identifier, window_start, count)
  VALUES (_bucket, _identifier, _window, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _current;

  -- Nettoyage opportuniste des fenêtres anciennes (>10 min)
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '10 minutes';

  RETURN _current <= _max_per_minute;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, TEXT, INTEGER) TO service_role;