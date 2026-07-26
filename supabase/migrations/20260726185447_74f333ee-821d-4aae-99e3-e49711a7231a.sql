-- Etapa 6: filtro por facetas na busca pública.
-- Índice para o EXISTS de contagem por produto (AND entre facetas).
CREATE INDEX IF NOT EXISTS idx_product_facets_term_product
  ON public.product_facets (term_id, product_id);

CREATE OR REPLACE FUNCTION public.search_products(
  _q text DEFAULT NULL::text,
  _category_slug text DEFAULT NULL::text,
  _price_min numeric DEFAULT NULL::numeric,
  _price_max numeric DEFAULT NULL::numeric,
  _sort text DEFAULT 'relevance'::text,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 24,
  _material text DEFAULT NULL::text,
  _color text DEFAULT NULL::text,
  _max_moq integer DEFAULT NULL::integer,
  _max_days integer DEFAULT NULL::integer,
  _state text DEFAULT NULL::text,
  _has_video boolean DEFAULT NULL::boolean,
  _facets text[] DEFAULT NULL::text[]
)
RETURNS TABLE(id uuid, name text, slug text, short_description text, price numeric, price_on_request boolean, currency text, views_count integer, created_at timestamp with time zone, company_id uuid, company_slug text, company_name text, category_slug text, category_name text, primary_image_url text, promo_price numeric, is_clearance boolean, is_unusual boolean, video_url text, total_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_query tsquery;
  v_offset int;
  v_limit int;
  v_material text;
  v_color text;
  v_facets text[];
  v_facet_count int;
BEGIN
  v_limit := least(greatest(coalesce(_page_size, 24), 1), 60);
  v_offset := greatest((coalesce(_page, 1) - 1) * v_limit, 0);
  v_material := NULLIF(trim(coalesce(_material, '')), '');
  v_color := NULLIF(trim(coalesce(_color, '')), '');

  -- Normaliza a lista de slugs de faceta: remove vazios/duplicados e limita a 6
  -- para evitar consultas patológicas vindas da URL.
  SELECT array_agg(DISTINCT s)
    INTO v_facets
    FROM (
      SELECT lower(btrim(x)) AS s
        FROM unnest(coalesce(_facets, ARRAY[]::text[])) x
       WHERE NULLIF(btrim(x), '') IS NOT NULL
       LIMIT 6
    ) t;
  v_facet_count := coalesce(array_length(v_facets, 1), 0);

  IF _q IS NOT NULL AND length(trim(_q)) > 0 THEN
    v_query := websearch_to_tsquery('portuguese', public.unaccent_safe(trim(_q)));
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id, p.name, p.slug, p.short_description, p.price, p.price_on_request, p.currency,
      p.views_count, p.created_at, p.company_id,
      c.slug  AS company_slug,
      c.name  AS company_name,
      cat.slug AS category_slug,
      cat.name AS category_name,
      p.promo_price, p.is_clearance, p.is_unusual, p.video_url,
      p.min_order_quantity, p.production_time_days,
      coalesce(p.promo_price, p.price) AS effective_price,
      CASE
        WHEN p.promo_price IS NOT NULL AND p.price IS NOT NULL AND p.price > 0 AND p.promo_price < p.price
          THEN round(((p.price - p.promo_price) / p.price) * 100, 2)
        ELSE NULL
      END AS discount_pct,
      CASE WHEN v_query IS NOT NULL THEN ts_rank_cd(p.search_vector, v_query) ELSE 0 END AS rank
    FROM public.products p
    JOIN public.companies c ON c.id = p.company_id
    LEFT JOIN public.categories cat ON cat.id = p.category_id
    WHERE p.is_active = true
      AND p.deleted_at IS NULL
      AND p.moderation_status = 'approved'
      AND c.status = 'approved'
      AND (v_query IS NULL OR p.search_vector @@ v_query
           OR public.unaccent_safe(p.name) ILIKE '%' || public.unaccent_safe(_q) || '%')
      AND (_category_slug IS NULL OR cat.slug = _category_slug)
      AND (_price_min IS NULL OR (p.price IS NOT NULL AND p.price >= _price_min))
      AND (_price_max IS NULL OR (p.price IS NOT NULL AND p.price <= _price_max))
      AND (v_material IS NULL OR public.unaccent_safe(coalesce(p.material,'')) ILIKE '%' || public.unaccent_safe(v_material) || '%')
      AND (v_color IS NULL OR EXISTS (
        SELECT 1 FROM unnest(coalesce(p.colors, ARRAY[]::text[])) col
         WHERE public.unaccent_safe(col) ILIKE '%' || public.unaccent_safe(v_color) || '%'
      ))
      AND (_max_moq IS NULL OR p.min_order_quantity IS NULL OR p.min_order_quantity <= _max_moq)
      AND (_max_days IS NULL OR p.production_time_days IS NULL OR p.production_time_days <= _max_days)
      AND (_state IS NULL OR c.state = _state)
      AND (_has_video IS NOT TRUE OR NULLIF(trim(coalesce(p.video_url, '')), '') IS NOT NULL)
      -- AND entre facetas: o produto precisa casar com TODAS as marcadas.
      AND (
        v_facet_count = 0
        OR (
          SELECT count(DISTINCT ft.slug)
            FROM public.product_facets pf
            JOIN public.facet_terms ft ON ft.id = pf.term_id
           WHERE pf.product_id = p.id
             AND ft.is_active = true
             AND ft.slug = ANY (v_facets)
        ) = v_facet_count
      )
  ),
  counted AS (SELECT b.*, count(*) OVER () AS total_count FROM base b)
  SELECT
    b.id, b.name, b.slug, b.short_description, b.price, b.price_on_request, b.currency,
    b.views_count, b.created_at, b.company_id, b.company_slug, b.company_name,
    b.category_slug, b.category_name,
    (SELECT pi.url FROM public.product_images pi
      WHERE pi.product_id = b.id
      ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS primary_image_url,
    b.promo_price, b.is_clearance, b.is_unusual, b.video_url,
    b.total_count
  FROM counted b
  ORDER BY
    CASE WHEN _sort = 'relevance'  AND v_query IS NOT NULL THEN b.rank END DESC NULLS LAST,
    CASE WHEN _sort = 'price_asc'  THEN b.effective_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN b.effective_price END DESC NULLS LAST,
    CASE WHEN _sort = 'popular'    THEN b.views_count END DESC NULLS LAST,
    CASE WHEN _sort = 'discount'   THEN b.discount_pct END DESC NULLS LAST,
    CASE WHEN _sort = 'moq_asc'    THEN b.min_order_quantity END ASC NULLS LAST,
    CASE WHEN _sort = 'delivery_asc' THEN b.production_time_days END ASC NULLS LAST,
    b.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$function$;