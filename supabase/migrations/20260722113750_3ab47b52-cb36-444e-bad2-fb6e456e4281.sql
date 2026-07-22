DO $mig$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'cron-history-purge-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
  PERFORM cron.schedule('cron-history-purge-daily', '0 3 * * *',
    'SELECT public.cron_history_purge(30);');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'security-events-purge-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
  PERFORM cron.schedule('security-events-purge-weekly', '15 3 * * 0',
    'SELECT public.security_events_purge(180);');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'product-views-purge-weekly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
  PERFORM cron.schedule('product-views-purge-weekly', '30 3 * * 0',
    'SELECT public.product_views_purge(90);');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'audit-log-purge-monthly';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
  PERFORM cron.schedule('audit-log-purge-monthly', '0 4 1 * *',
    'SELECT public.audit_log_purge(365);');

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'web-vitals-rollup-daily';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;
  PERFORM cron.schedule('web-vitals-rollup-daily', '0 2 * * *',
    'SELECT public.web_vitals_rollup();');
END
$mig$;
