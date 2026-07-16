CREATE OR REPLACE FUNCTION public.product_views_purge(_older_than_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.product_views
   WHERE viewed_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.product_views_purge(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_views_purge(integer) TO service_role;

DO $$ BEGIN
  PERFORM cron.unschedule('product-views-daily-purge');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'product-views-daily-purge',
  '30 3 * * *',  -- todo dia 03:30 UTC
  $$ SELECT public.product_views_purge(90); $$
);