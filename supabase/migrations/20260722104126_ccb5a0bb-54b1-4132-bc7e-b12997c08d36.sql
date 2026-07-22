
CREATE OR REPLACE FUNCTION public.get_cron_health(_limit integer DEFAULT 50)
RETURNS TABLE (
  jobname text,
  schedule text,
  last_run_start timestamptz,
  last_run_end timestamptz,
  last_status text,
  duration_ms numeric,
  last_error text,
  runs_24h bigint,
  failures_24h bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (d.jobid)
      d.jobid, d.start_time, d.end_time, d.status, d.return_message
    FROM cron.job_run_details d
    ORDER BY d.jobid, d.start_time DESC
  ),
  agg24 AS (
    SELECT jobid,
           count(*) AS runs_24h,
           count(*) FILTER (WHERE status <> 'succeeded') AS failures_24h
    FROM cron.job_run_details
    WHERE start_time > now() - interval '24 hours'
    GROUP BY jobid
  )
  SELECT
    j.jobname::text,
    j.schedule::text,
    l.start_time,
    l.end_time,
    l.status::text,
    EXTRACT(EPOCH FROM (l.end_time - l.start_time)) * 1000 AS duration_ms,
    CASE WHEN l.status <> 'succeeded' THEN l.return_message ELSE NULL END,
    COALESCE(a.runs_24h, 0),
    COALESCE(a.failures_24h, 0)
  FROM cron.job j
  LEFT JOIN latest l ON l.jobid = j.jobid
  LEFT JOIN agg24  a ON a.jobid = j.jobid
  ORDER BY j.jobname
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_health(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_health(integer) TO authenticated;
