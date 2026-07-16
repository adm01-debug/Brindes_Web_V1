
-- Versão parametrizada
CREATE OR REPLACE FUNCTION public.metrics_daily_snapshot(_day DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day DATE := COALESCE(_day, (now() AT TIME ZONE 'UTC')::date);
BEGIN
  INSERT INTO public.metrics_daily AS m (
    day,
    companies_total, companies_approved, companies_pending,
    products_total, products_approved, products_pending,
    leads_created, product_views
  )
  SELECT
    v_day,
    (SELECT count(*) FROM public.companies WHERE created_at::date <= v_day),
    (SELECT count(*) FROM public.companies WHERE status = 'approved' AND created_at::date <= v_day),
    (SELECT count(*) FROM public.companies WHERE status = 'pending' AND created_at::date <= v_day),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL AND created_at::date <= v_day),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL AND moderation_status = 'approved' AND created_at::date <= v_day),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL AND moderation_status = 'pending' AND created_at::date <= v_day),
    (SELECT count(*) FROM public.leads WHERE created_at::date = v_day),
    (SELECT count(*) FROM public.product_views WHERE viewed_at::date = v_day)
  ON CONFLICT (day) DO UPDATE SET
    companies_total    = EXCLUDED.companies_total,
    companies_approved = EXCLUDED.companies_approved,
    companies_pending  = EXCLUDED.companies_pending,
    products_total     = EXCLUDED.products_total,
    products_approved  = EXCLUDED.products_approved,
    products_pending   = EXCLUDED.products_pending,
    leads_created      = EXCLUDED.leads_created,
    product_views      = EXCLUDED.product_views,
    updated_at         = now();
END;
$$;

REVOKE ALL ON FUNCTION public.metrics_daily_snapshot(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_daily_snapshot(DATE) TO service_role;

-- Backfill dos últimos 30 dias
DO $$
DECLARE
  d DATE;
BEGIN
  FOR d IN
    SELECT generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, '1 day'::interval)::date
  LOOP
    PERFORM public.metrics_daily_snapshot(d);
  END LOOP;
END $$;
