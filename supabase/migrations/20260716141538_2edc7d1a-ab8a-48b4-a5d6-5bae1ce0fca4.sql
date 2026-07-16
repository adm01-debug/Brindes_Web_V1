
-- 1) Table
CREATE TABLE IF NOT EXISTS public.metrics_daily (
  day DATE PRIMARY KEY,
  companies_total INTEGER NOT NULL DEFAULT 0,
  companies_approved INTEGER NOT NULL DEFAULT 0,
  companies_pending INTEGER NOT NULL DEFAULT 0,
  products_total INTEGER NOT NULL DEFAULT 0,
  products_approved INTEGER NOT NULL DEFAULT 0,
  products_pending INTEGER NOT NULL DEFAULT 0,
  leads_created INTEGER NOT NULL DEFAULT 0,
  product_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.metrics_daily TO authenticated;
GRANT ALL ON public.metrics_daily TO service_role;

ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read metrics_daily" ON public.metrics_daily;
CREATE POLICY "Admins can read metrics_daily"
  ON public.metrics_daily
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS metrics_daily_set_updated_at ON public.metrics_daily;
CREATE TRIGGER metrics_daily_set_updated_at
  BEFORE UPDATE ON public.metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Snapshot function
CREATE OR REPLACE FUNCTION public.metrics_daily_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.metrics_daily AS m (
    day,
    companies_total, companies_approved, companies_pending,
    products_total, products_approved, products_pending,
    leads_created, product_views
  )
  SELECT
    v_day,
    (SELECT count(*) FROM public.companies),
    (SELECT count(*) FROM public.companies WHERE status = 'approved'),
    (SELECT count(*) FROM public.companies WHERE status = 'pending'),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL AND moderation_status = 'approved'),
    (SELECT count(*) FROM public.products WHERE deleted_at IS NULL AND moderation_status = 'pending'),
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

REVOKE ALL ON FUNCTION public.metrics_daily_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_daily_snapshot() TO service_role;

-- 3) Backfill hoje
SELECT public.metrics_daily_snapshot();

-- 4) Schedule
DO $$
BEGIN
  PERFORM cron.unschedule('metrics-daily-snapshot');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'metrics-daily-snapshot',
  '45 3 * * *',
  $$ SELECT public.metrics_daily_snapshot(); $$
);
