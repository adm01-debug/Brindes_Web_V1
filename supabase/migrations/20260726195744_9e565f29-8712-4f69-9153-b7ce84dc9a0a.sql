-- Estado de invalidação do cache de contagens. Linha única (id = true).
CREATE TABLE IF NOT EXISTS public.facet_counts_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  dirty boolean NOT NULL DEFAULT true,
  last_refreshed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela puramente interna: só o dono/SECURITY DEFINER e o service_role tocam.
REVOKE ALL ON public.facet_counts_state FROM anon, authenticated;
GRANT ALL ON public.facet_counts_state TO service_role;
ALTER TABLE public.facet_counts_state ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhum acesso via Data API por anon/authenticated (proposital).

INSERT INTO public.facet_counts_state (id, dirty)
VALUES (true, true)
ON CONFLICT (id) DO NOTHING;

-- Marcador de sujeira. STATEMENT-level: um UPDATE em massa marca uma vez só.
CREATE OR REPLACE FUNCTION public.mark_facet_counts_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.facet_counts_state
     SET dirty = true, updated_at = now()
   WHERE id = true AND dirty = false;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_facet_counts_dirty_pf ON public.product_facets;
CREATE TRIGGER trg_facet_counts_dirty_pf
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.product_facets
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

-- Em products só interessam as colunas que decidem a publicação.
DROP TRIGGER IF EXISTS trg_facet_counts_dirty_products ON public.products;
CREATE TRIGGER trg_facet_counts_dirty_products
AFTER INSERT OR DELETE ON public.products
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

DROP TRIGGER IF EXISTS trg_facet_counts_dirty_products_upd ON public.products;
CREATE TRIGGER trg_facet_counts_dirty_products_upd
AFTER UPDATE OF is_active, deleted_at, moderation_status, company_id ON public.products
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

-- Aprovar/suspender empresa muda a visibilidade de todo o catálogo dela.
DROP TRIGGER IF EXISTS trg_facet_counts_dirty_companies ON public.companies;
CREATE TRIGGER trg_facet_counts_dirty_companies
AFTER UPDATE OF status ON public.companies
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

-- Ativar/desativar termos ou eixos altera o conjunto de linhas da MV.
DROP TRIGGER IF EXISTS trg_facet_counts_dirty_terms ON public.facet_terms;
CREATE TRIGGER trg_facet_counts_dirty_terms
AFTER INSERT OR UPDATE OR DELETE ON public.facet_terms
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

DROP TRIGGER IF EXISTS trg_facet_counts_dirty_axes ON public.facet_axes;
CREATE TRIGGER trg_facet_counts_dirty_axes
AFTER INSERT OR UPDATE OR DELETE ON public.facet_axes
FOR EACH STATEMENT EXECUTE FUNCTION public.mark_facet_counts_dirty();

-- Refresh condicional: o REFRESH pesado só roda quando há mudança pendente.
-- _force permite reconstruir manualmente após manutenção.
CREATE OR REPLACE FUNCTION public.refresh_facet_term_counts(_force boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _dirty boolean;
BEGIN
  SELECT dirty INTO _dirty FROM public.facet_counts_state WHERE id = true FOR UPDATE;
  IF _dirty IS NULL THEN
    INSERT INTO public.facet_counts_state (id, dirty) VALUES (true, true)
    ON CONFLICT (id) DO NOTHING;
    _dirty := true;
  END IF;

  IF NOT _dirty AND NOT _force THEN
    RETURN false;
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_facet_term_counts;
  EXCEPTION WHEN OTHERS THEN
    -- CONCURRENTLY exige a MV populada; cobre o primeiro refresh pós-restore.
    REFRESH MATERIALIZED VIEW public.mv_facet_term_counts;
  END;

  UPDATE public.facet_counts_state
     SET dirty = false, last_refreshed_at = now(), updated_at = now()
   WHERE id = true;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_facet_term_counts(boolean) FROM PUBLIC, anon, authenticated;

-- A assinatura antiga (sem argumentos) foi substituída pela versão com default.
DROP FUNCTION IF EXISTS public.refresh_facet_term_counts();

-- Reagenda: verificação barata a cada 2 min, trabalho pesado só se sujo.
SELECT cron.unschedule('refresh-facet-term-counts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-facet-term-counts');

SELECT cron.schedule(
  'refresh-facet-term-counts',
  '*/2 * * * *',
  $$SELECT public.refresh_facet_term_counts();$$
);

SELECT public.refresh_facet_term_counts(true);