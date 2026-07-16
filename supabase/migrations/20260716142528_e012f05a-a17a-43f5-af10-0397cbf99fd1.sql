
CREATE OR REPLACE FUNCTION public.get_admin_metrics_range(
  _from DATE DEFAULT (now() AT TIME ZONE 'UTC')::date - 29,
  _to   DATE DEFAULT (now() AT TIME ZONE 'UTC')::date
)
RETURNS SETOF public.metrics_daily
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF _to < _from THEN
    RAISE EXCEPTION 'Intervalo inválido' USING ERRCODE = '22023';
  END IF;

  IF (_to - _from) > 366 THEN
    RAISE EXCEPTION 'Janela máxima de 366 dias' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
    SELECT * FROM public.metrics_daily
     WHERE day BETWEEN _from AND _to
     ORDER BY day ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_metrics_range(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics_range(DATE, DATE) TO authenticated;
