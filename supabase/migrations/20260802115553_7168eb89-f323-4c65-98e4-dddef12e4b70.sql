-- ============================================================
-- Etapa 45 — Watchdog ativo de tarefas agendadas
-- Gap estrutural: a falha do metrics-daily-snapshot passou 17
-- dias despercebida porque a observabilidade era *pull-only*.
-- Esta etapa converte o monitoramento em *push*.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tolerância de atraso derivada da própria expressão cron.
--    Evita hardcodar limites por job: novos jobs ganham
--    supervisão automaticamente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_schedule_max_age(_schedule text)
RETURNS interval
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  f text[];
  v_min text;
  v_step int;
BEGIN
  IF _schedule IS NULL THEN RETURN interval '32 days'; END IF;

  -- Sintaxe abreviada do pg_cron: '10 seconds', '1 minute', ...
  IF _schedule ~* '^\s*\d+\s+(second|minute|hour|day)s?\s*$' THEN
    RETURN GREATEST(_schedule::interval * 4, interval '15 minutes');
  END IF;

  f := regexp_split_to_array(btrim(_schedule), '\s+');
  IF array_length(f, 1) <> 5 THEN RETURN interval '32 days'; END IF;

  v_min := f[1];

  -- Mensal: dia-do-mês fixo
  IF f[3] <> '*' THEN RETURN interval '32 days'; END IF;
  -- Semanal: dia-da-semana fixo
  IF f[5] <> '*' THEN RETURN interval '8 days'; END IF;
  -- Diário: hora fixa
  IF f[2] <> '*' THEN RETURN interval '26 hours'; END IF;

  -- De minuto em minuto
  IF v_min = '*' THEN RETURN interval '15 minutes'; END IF;

  -- Passo: */N
  IF v_min ~ '^\*/\d+$' THEN
    v_step := substring(v_min from 3)::int;
    RETURN GREATEST(make_interval(mins => v_step * 4), interval '15 minutes');
  END IF;

  -- Horário: minuto fixo, toda hora
  RETURN interval '4 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.cron_schedule_max_age(text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 2) Visão consolidada de problemas: falha OU parada.
--    Reaproveitada tanto pelo watchdog quanto pela UI.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_problems()
RETURNS TABLE(jobname text, schedule text, problem text, detail text, last_run timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (d.jobid)
      d.jobid, d.start_time, d.status, d.return_message
    FROM cron.job_run_details d
    ORDER BY d.jobid, d.start_time DESC
  )
  SELECT
    j.jobname::text,
    j.schedule::text,
    CASE
      WHEN l.jobid IS NULL THEN 'never_ran'
      WHEN l.status <> 'succeeded' THEN 'failed'
      ELSE 'stalled'
    END,
    CASE
      WHEN l.jobid IS NULL THEN 'Nunca executou desde o agendamento.'
      WHEN l.status <> 'succeeded' THEN left(COALESCE(l.return_message, l.status), 500)
      ELSE 'Sem execução desde ' || to_char(l.start_time, 'YYYY-MM-DD HH24:MI') ||
           ' (tolerância ' || public.cron_schedule_max_age(j.schedule::text)::text || ').'
    END,
    l.start_time
  FROM cron.job j
  LEFT JOIN latest l ON l.jobid = j.jobid
  WHERE j.active
    AND (
      l.jobid IS NULL
      OR l.status <> 'succeeded'
      OR l.start_time < now() - public.cron_schedule_max_age(j.schedule::text)
    );
$$;

REVOKE ALL ON FUNCTION public.cron_problems() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3) Leitura para a UI (guarda de admin explícita).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_problems()
RETURNS TABLE(jobname text, schedule text, problem text, detail text, last_run timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.cron_problems() ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_problems() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_problems() TO authenticated;

-- ------------------------------------------------------------
-- 4) Watchdog: registra evento + notifica admins, com
--    anti-repetição de 6h por (job, tipo de problema).
--    Nunca lança exceção: um watchdog que quebra é pior que
--    watchdog nenhum.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cron_watchdog()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_new integer := 0;
BEGIN
  FOR r IN SELECT * FROM public.cron_problems() LOOP
    BEGIN
      -- Deduplicação: o mesmo job com o mesmo problema só gera
      -- um alerta a cada 6 horas.
      IF EXISTS (
        SELECT 1 FROM public.security_events se
         WHERE se.event_type = 'cron_' || r.problem
           AND se.subject = r.jobname
           AND se.created_at > now() - interval '6 hours'
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.security_events (event_type, subject, metadata)
      VALUES (
        'cron_' || r.problem,
        r.jobname,
        jsonb_build_object('schedule', r.schedule, 'detail', r.detail, 'last_run', r.last_run)
      );

      INSERT INTO public.notifications (user_id, kind, title, body, url, metadata)
      SELECT
        ur.user_id,
        'system',
        'Tarefa agendada com problema',
        r.jobname || ': ' || left(r.detail, 160),
        '/painel/admin/observabilidade',
        jsonb_build_object('jobname', r.jobname, 'problem', r.problem)
      FROM public.user_roles ur
      WHERE ur.role = 'admin';

      v_new := v_new + 1;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_watchdog() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 5) Agendamento a cada 15 minutos.
-- ------------------------------------------------------------
SELECT cron.unschedule('cron-watchdog')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-watchdog');

SELECT cron.schedule('cron-watchdog', '*/15 * * * *', $cmd$ SELECT public.cron_watchdog(); $cmd$);