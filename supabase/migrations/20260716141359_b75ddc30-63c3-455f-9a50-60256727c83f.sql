CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove agendamento anterior se existir (idempotente)
DO $$ BEGIN
  PERFORM cron.unschedule('audit-log-weekly-purge');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'audit-log-weekly-purge',
  '0 3 * * 0',  -- domingo, 03:00 UTC
  $$ SELECT public.audit_log_purge(365); $$
);