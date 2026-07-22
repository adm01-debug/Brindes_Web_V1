
-- Hardening: revogar EXECUTE de roles públicas nas SECURITY DEFINER
-- Manutenção (só service_role e postgres precisam chamar):
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'cron_history_purge(integer)',
    'security_events_purge(integer)',
    'audit_log_purge(integer)',
    'product_views_purge(integer)',
    'leads_purge(integer)',
    'storage_purge_orphans(text,integer)',
    'metrics_daily_snapshot()',
    'metrics_daily_snapshot(date)',
    'refresh_company_stats()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;

-- Admin-callable via RPC (mantém authenticated; has_role bloqueia não-admin):
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'get_slow_queries(integer)',
    'reset_query_stats()',
    'get_cron_health(integer)',
    'get_security_events(timestamptz,timestamptz,integer)',
    'get_admin_metrics_range(date,date)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;
