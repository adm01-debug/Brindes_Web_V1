
-- Materialized view
DROP MATERIALIZED VIEW IF EXISTS public.mv_company_stats;

CREATE MATERIALIZED VIEW public.mv_company_stats AS
SELECT
  c.id AS company_id,
  c.slug,
  COUNT(DISTINCT p.id) FILTER (
    WHERE p.deleted_at IS NULL AND p.is_active = true AND p.moderation_status = 'approved'
  ) AS products_approved,
  COUNT(DISTINCT p.id) FILTER (
    WHERE p.deleted_at IS NULL
  ) AS products_total,
  COALESCE(SUM(p.views_count) FILTER (WHERE p.deleted_at IS NULL), 0) AS total_views,
  (SELECT COUNT(*) FROM public.leads l WHERE l.company_id = c.id) AS leads_total,
  (SELECT COUNT(*) FROM public.leads l WHERE l.company_id = c.id AND l.created_at > now() - interval '30 days') AS leads_30d,
  now() AS refreshed_at
FROM public.companies c
LEFT JOIN public.products p ON p.company_id = c.id
GROUP BY c.id, c.slug;

CREATE UNIQUE INDEX mv_company_stats_company_id_uq
  ON public.mv_company_stats (company_id);

CREATE INDEX mv_company_stats_slug_idx
  ON public.mv_company_stats (slug);

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_company_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_company_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_company_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_company_stats() TO service_role;

-- RPC segura para leitura (dono da empresa ou admin)
CREATE OR REPLACE FUNCTION public.get_company_stats(_slug TEXT)
RETURNS TABLE (
  products_approved BIGINT,
  products_total BIGINT,
  total_views BIGINT,
  leads_total BIGINT,
  leads_30d BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_owner_id UUID;
BEGIN
  SELECT c.id, c.owner_id INTO v_company_id, v_owner_id
    FROM public.companies c WHERE c.slug = _slug;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = v_owner_id) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT s.products_approved, s.products_total, s.total_views,
           s.leads_total, s.leads_30d, s.refreshed_at
      FROM public.mv_company_stats s
     WHERE s.company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_stats(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_stats(TEXT) TO authenticated;

-- Refresh inicial
REFRESH MATERIALIZED VIEW public.mv_company_stats;

-- Cron a cada 30 min
DO $$
BEGIN
  PERFORM cron.unschedule('company-stats-refresh');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'company-stats-refresh',
  '*/30 * * * *',
  $$ SELECT public.refresh_company_stats(); $$
);
