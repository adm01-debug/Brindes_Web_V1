-- 1) Desduplicação de jobs de manutenção (mesma função agendada 2x)
SELECT cron.unschedule('audit-log-weekly-purge');
SELECT cron.unschedule('cron-history-purge-weekly');
SELECT cron.unschedule('security-events-purge-weekly');
SELECT cron.unschedule('product-views-purge-weekly');

-- 2) Rollup de web vitals resiliente a falhas: reprocessa janela de N dias.
--    Antes: apenas D-1. Se o job falhasse uma noite, o dia ficava sem p75 para sempre.
CREATE OR REPLACE FUNCTION public.web_vitals_rollup(_day date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end   DATE := COALESCE(_day, (now() AT TIME ZONE 'UTC')::date - 1);
  -- Quando chamado sem argumento (cron), reprocessa D-1..D-3 para fechar lacunas.
  v_start DATE := CASE WHEN _day IS NULL THEN v_end - 2 ELSE v_end END;
  v_rows  INTEGER := 0;
  v_n     INTEGER;
  v_day   DATE;
BEGIN
  FOR v_day IN SELECT generate_series(v_start, v_end, INTERVAL '1 day')::date LOOP
    INSERT INTO public.web_vitals_daily AS d (day, metric, route, samples, p75, updated_at)
    SELECT v_day, metric, route, count(*), percentile_cont(0.75) WITHIN GROUP (ORDER BY value), now()
    FROM public.web_vitals_events
    WHERE created_at >= v_day AND created_at < v_day + INTERVAL '1 day'
    GROUP BY metric, route
    ON CONFLICT (day, metric, route) DO UPDATE SET
      samples    = EXCLUDED.samples,
      p75        = EXCLUDED.p75,
      updated_at = now();
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_rows := v_rows + v_n;
  END LOOP;

  -- Retenção: eventos brutos vivem 7 dias (a janela de reprocesso cabe dentro disso).
  DELETE FROM public.web_vitals_events WHERE created_at < now() - INTERVAL '7 days';
  RETURN v_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.web_vitals_rollup(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.web_vitals_rollup(date) TO service_role;

-- 3) Autovacuum agressivo nas tabelas de telemetria (insert+delete pesado -> bloat)
ALTER TABLE public.web_vitals_events SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.product_views     SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.security_events   SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE public.audit_log         SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);