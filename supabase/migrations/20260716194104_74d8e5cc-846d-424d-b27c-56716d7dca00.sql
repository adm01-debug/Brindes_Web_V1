
-- =========================================================
-- 1. Slow queries monitor
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE OR REPLACE VIEW public.v_slow_queries AS
SELECT
  s.queryid,
  s.calls,
  s.rows,
  s.total_exec_time,
  s.mean_exec_time,
  s.max_exec_time,
  s.query
FROM extensions.pg_stat_statements s
JOIN pg_database d ON d.oid = s.dbid
WHERE d.datname = current_database()
ORDER BY s.total_exec_time DESC
LIMIT 50;

REVOKE ALL ON public.v_slow_queries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_slow_queries TO service_role;

CREATE OR REPLACE FUNCTION public.get_slow_queries(_limit int DEFAULT 20)
RETURNS TABLE(
  queryid bigint,
  calls bigint,
  rows bigint,
  total_exec_time double precision,
  mean_exec_time double precision,
  max_exec_time double precision,
  query text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.queryid, s.calls, s.rows, s.total_exec_time,
           s.mean_exec_time, s.max_exec_time, s.query
    FROM extensions.pg_stat_statements s
    JOIN pg_database d ON d.oid = s.dbid
    WHERE d.datname = current_database()
    ORDER BY s.total_exec_time DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION public.get_slow_queries(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_query_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  PERFORM extensions.pg_stat_statements_reset();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_query_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_query_stats() TO authenticated;

-- =========================================================
-- 2. security_events table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  subject text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_security_events_type_created
  ON public.security_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_subject_created
  ON public.security_events (subject, created_at DESC);

-- Update leads_rate_limit to log events
CREATE OR REPLACE FUNCTION public.leads_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hour_count INTEGER;
  v_day_count INTEGER;
BEGIN
  SELECT count(*) INTO v_hour_count
  FROM public.leads
  WHERE email = NEW.email
    AND company_id = NEW.company_id
    AND created_at > now() - interval '1 hour';

  IF v_hour_count >= 5 THEN
    BEGIN
      INSERT INTO public.security_events (event_type, subject, metadata)
      VALUES ('lead_rate_limit_hour', NEW.email,
              jsonb_build_object('company_id', NEW.company_id, 'count', v_hour_count));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'Limite de envios atingido. Aguarde antes de enviar novo contato.'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_day_count
  FROM public.leads
  WHERE email = NEW.email
    AND company_id = NEW.company_id
    AND created_at > now() - interval '24 hours';

  IF v_day_count >= 20 THEN
    BEGIN
      INSERT INTO public.security_events (event_type, subject, metadata)
      VALUES ('lead_rate_limit_day', NEW.email,
              jsonb_build_object('company_id', NEW.company_id, 'count', v_day_count));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE EXCEPTION 'Limite diário de contatos para esta empresa atingido.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$function$;

-- RPC for admin to fetch security events
CREATE OR REPLACE FUNCTION public.get_security_events(
  _from timestamptz DEFAULT now() - interval '30 days',
  _to timestamptz DEFAULT now(),
  _limit int DEFAULT 200
)
RETURNS SETOF public.security_events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF _to < _from THEN
    RAISE EXCEPTION 'Intervalo inválido' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT * FROM public.security_events
    WHERE created_at BETWEEN _from AND _to
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 1000);
END;
$$;

REVOKE ALL ON FUNCTION public.get_security_events(timestamptz, timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_security_events(timestamptz, timestamptz, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.security_events_purge(_older_than_days int DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.security_events
   WHERE created_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.security_events_purge(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_events_purge(int) TO service_role;

-- Schedule weekly purge (Sunday 04:00 UTC)
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('security_events_purge_job');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  PERFORM cron.schedule(
    'security_events_purge_job',
    '0 4 * * 0',
    $cron$ SELECT public.security_events_purge(180); $cron$
  );
END $$;

-- =========================================================
-- 3. Final RLS / GRANT sweep
-- =========================================================

-- Revoke anon SELECT on sensitive tables (RLS also blocks, but defense-in-depth)
REVOKE SELECT ON public.audit_log FROM anon;
REVOKE SELECT ON public.leads FROM anon;
REVOKE SELECT ON public.metrics_daily FROM anon;
REVOKE SELECT ON public.product_views FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;

-- Ensure public catalog remains readable to anon (idempotent)
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT ON public.product_variants TO anon;

-- Lock down internal SECURITY DEFINER helpers (triggers don't require EXECUTE grants)
REVOKE ALL ON FUNCTION public.strip_dangerous_html(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.strip_dangerous_html(text) TO service_role;

REVOKE ALL ON FUNCTION public.extract_storage_path(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extract_storage_path(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.audit_log_purge(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_purge(int) TO service_role;

REVOKE ALL ON FUNCTION public.product_views_purge(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_views_purge(int) TO service_role;

REVOKE ALL ON FUNCTION public.leads_purge(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leads_purge(int) TO service_role;

REVOKE ALL ON FUNCTION public.storage_purge_orphans(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_purge_orphans(text, int) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_company_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_company_stats() TO service_role;

-- metrics_daily_snapshot has two overloads
REVOKE ALL ON FUNCTION public.metrics_daily_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_daily_snapshot() TO service_role;
REVOKE ALL ON FUNCTION public.metrics_daily_snapshot(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_daily_snapshot(date) TO service_role;

-- Ensure frontend-facing RPCs remain callable
GRANT EXECUTE ON FUNCTION public.mark_leads_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(text, text, numeric, numeric, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_companies(text, text, text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Audit: notice for any public table without RLS enabled
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  LOOP
    RAISE NOTICE 'Table without RLS: public.%', r.relname;
  END LOOP;
END $$;
