
CREATE OR REPLACE FUNCTION public.cron_history_purge(_older_than_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM cron.job_run_details
   WHERE start_time < now() - make_interval(days => GREATEST(COALESCE(_older_than_days, 30), 7));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_history_purge(integer) FROM PUBLIC, anon, authenticated;
