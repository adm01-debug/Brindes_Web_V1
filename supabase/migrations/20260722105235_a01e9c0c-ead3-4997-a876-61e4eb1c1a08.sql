
-- Tabela de eventos brutos (curta retenção, 7 dias)
CREATE TABLE public.web_vitals_events (
  id BIGSERIAL PRIMARY KEY,
  metric TEXT NOT NULL CHECK (metric IN ('LCP','INP','CLS','TTFB','FCP')),
  value NUMERIC(10,3) NOT NULL CHECK (value >= 0 AND value < 100000),
  rating TEXT CHECK (rating IN ('good','needs-improvement','poor')),
  route TEXT NOT NULL CHECK (char_length(route) BETWEEN 1 AND 200),
  nav_type TEXT CHECK (char_length(nav_type) <= 32),
  ua_family TEXT CHECK (char_length(ua_family) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.web_vitals_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.web_vitals_events_id_seq TO anon, authenticated;
GRANT SELECT, DELETE ON public.web_vitals_events TO service_role;

ALTER TABLE public.web_vitals_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wv_events_insert_public"
  ON public.web_vitals_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "wv_events_select_admin"
  ON public.web_vitals_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wv_events_created ON public.web_vitals_events (created_at DESC);
CREATE INDEX idx_wv_events_metric_route ON public.web_vitals_events (metric, route, created_at DESC);

-- Tabela de agregados (leitura barata pelo dashboard)
CREATE TABLE public.web_vitals_daily (
  day DATE NOT NULL,
  metric TEXT NOT NULL,
  route TEXT NOT NULL,
  samples BIGINT NOT NULL DEFAULT 0,
  p75 NUMERIC(10,3),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, metric, route)
);

GRANT SELECT ON public.web_vitals_daily TO authenticated;
GRANT ALL ON public.web_vitals_daily TO service_role;

ALTER TABLE public.web_vitals_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wv_daily_select_admin"
  ON public.web_vitals_daily FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Rollup + purge
CREATE OR REPLACE FUNCTION public.web_vitals_rollup(_day DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day DATE := COALESCE(_day, (now() AT TIME ZONE 'UTC')::date - 1);
  v_rows INTEGER;
BEGIN
  INSERT INTO public.web_vitals_daily AS d (day, metric, route, samples, p75, updated_at)
  SELECT
    v_day,
    metric,
    route,
    count(*) AS samples,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
    now()
  FROM public.web_vitals_events
  WHERE created_at >= v_day AND created_at < v_day + INTERVAL '1 day'
  GROUP BY metric, route
  ON CONFLICT (day, metric, route) DO UPDATE SET
    samples    = EXCLUDED.samples,
    p75        = EXCLUDED.p75,
    updated_at = now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Purge de eventos brutos com mais de 7 dias
  DELETE FROM public.web_vitals_events WHERE created_at < now() - INTERVAL '7 days';
  RETURN v_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.web_vitals_rollup(DATE) FROM anon, authenticated;

-- Agendamento diário 02:00 UTC
SELECT cron.schedule(
  'web-vitals-rollup-daily',
  '0 2 * * *',
  $$SELECT public.web_vitals_rollup();$$
);
