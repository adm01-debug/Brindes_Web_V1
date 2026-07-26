-- Etapa 8: contadores públicos de produtos por termo de faceta.
-- SECURITY DEFINER porque agrega apenas números já públicos (produtos aprovados),
-- evitando expor linhas individuais de product_facets.
CREATE OR REPLACE FUNCTION public.facet_term_counts(_axis_slug text DEFAULT NULL::text)
RETURNS TABLE(term_id uuid, term_slug text, axis_slug text, products_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    ft.id AS term_id,
    ft.slug AS term_slug,
    fa.slug AS axis_slug,
    count(p.id) AS products_count
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
    AND (_axis_slug IS NULL OR fa.slug = _axis_slug)
  GROUP BY ft.id, ft.slug, fa.slug;
$function$;

REVOKE ALL ON FUNCTION public.facet_term_counts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.facet_term_counts(text) TO anon, authenticated, service_role;