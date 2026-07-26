-- Cache das contagens por termo de faceta.
-- Motivação: a função STABLE varria product_facets + products + companies a
-- cada request de hub/sitemap. Com o catálogo crescendo isso vira full scan.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_facet_term_counts AS
  SELECT
    ft.id   AS term_id,
    ft.slug AS term_slug,
    fa.slug AS axis_slug,
    count(p.id)::bigint AS products_count
  FROM public.facet_terms ft
  JOIN public.facet_axes fa ON fa.id = ft.axis_id AND fa.is_active = true
  LEFT JOIN public.product_facets pf ON pf.term_id = ft.id
  LEFT JOIN public.products p
         ON p.id = pf.product_id
        AND p.is_active = true
        AND p.deleted_at IS NULL
        AND p.moderation_status = 'approved'
        AND EXISTS (
          SELECT 1 FROM public.companies c
           WHERE c.id = p.company_id AND c.status = 'approved'
        )
  WHERE ft.is_active = true
  GROUP BY ft.id, ft.slug, fa.slug;

-- Índice único é pré-requisito do REFRESH ... CONCURRENTLY (sem lock de leitura).
CREATE UNIQUE INDEX IF NOT EXISTS mv_facet_term_counts_pk
  ON public.mv_facet_term_counts (term_id);
CREATE INDEX IF NOT EXISTS mv_facet_term_counts_axis
  ON public.mv_facet_term_counts (axis_slug);

-- A MV não é exposta na Data API; o acesso é só via a função abaixo.
REVOKE ALL ON public.mv_facet_term_counts FROM anon, authenticated;

-- Mesma assinatura de antes: nenhum código cliente precisa mudar.
CREATE OR REPLACE FUNCTION public.facet_term_counts(_axis_slug text DEFAULT NULL::text)
RETURNS TABLE(term_id uuid, term_slug text, axis_slug text, products_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT m.term_id, m.term_slug, m.axis_slug, m.products_count
  FROM public.mv_facet_term_counts m
  WHERE _axis_slug IS NULL OR m.axis_slug = _axis_slug;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_facet_term_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- CONCURRENTLY exige a MV já populada ao menos uma vez; o fallback cobre
  -- o primeiro refresh após um restore.
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_facet_term_counts;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_facet_term_counts;
  END;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_facet_term_counts() FROM PUBLIC, anon, authenticated;

-- Popula imediatamente para não servir contagens vazias.
REFRESH MATERIALIZED VIEW public.mv_facet_term_counts;

-- Atualização periódica.
SELECT cron.unschedule('refresh-facet-term-counts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-facet-term-counts');

SELECT cron.schedule(
  'refresh-facet-term-counts',
  '*/10 * * * *',
  $$SELECT public.refresh_facet_term_counts();$$
);