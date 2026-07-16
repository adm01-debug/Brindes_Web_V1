-- Fase 2.1: Busca performática com full-text search em português
-- Índice GIN sobre tsvector construído a partir de name + short_description + description,
-- normalizado com unaccent_safe (IMMUTABLE) para busca acento-insensível.

-- 1) Coluna gerada com o tsvector (evita recomputar em cada query)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', public.unaccent_safe(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.unaccent_safe(coalesce(short_description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.unaccent_safe(coalesce(description, ''))), 'C')
  ) STORED;

-- 2) GIN index sobre a coluna gerada
CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON public.products USING GIN (search_vector);

-- 3) Índice trigram para fallback ILIKE (busca por prefixo/erro de digitação)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON public.products USING GIN (public.unaccent_safe(name) gin_trgm_ops);

-- 4) RPC search_products: filtros combináveis + ranking + paginação
CREATE OR REPLACE FUNCTION public.search_products(
  _q text DEFAULT NULL,
  _category_slug text DEFAULT NULL,
  _price_min numeric DEFAULT NULL,
  _price_max numeric DEFAULT NULL,
  _sort text DEFAULT 'relevance',      -- relevance | newest | price_asc | price_desc | popular
  _page int DEFAULT 1,
  _page_size int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  short_description text,
  price numeric,
  price_on_request boolean,
  currency text,
  views_count integer,
  created_at timestamptz,
  company_id uuid,
  company_slug text,
  company_name text,
  category_slug text,
  category_name text,
  primary_image_url text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query tsquery;
  v_q text;
  v_offset int;
  v_limit int;
BEGIN
  v_limit := least(greatest(coalesce(_page_size, 24), 1), 60);
  v_offset := greatest((coalesce(_page, 1) - 1) * v_limit, 0);

  IF _q IS NOT NULL AND length(trim(_q)) > 0 THEN
    v_q := public.unaccent_safe(trim(_q));
    -- websearch aceita "aspas", -exclusão, OR — mais tolerante que plainto_tsquery
    v_query := websearch_to_tsquery('portuguese', v_q);
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
      CASE
        WHEN v_query IS NOT NULL THEN ts_rank_cd(p.search_vector, v_query)
        ELSE 0
      END AS rank
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
  ),
  counted AS (
    SELECT b.*, count(*) OVER () AS total_count FROM base b
  )
  SELECT
    b.id, b.name, b.slug, b.short_description, b.price, b.price_on_request, b.currency,
    b.views_count, b.created_at, b.company_id, b.company_slug, b.company_name,
    b.category_slug, b.category_name,
    (
      SELECT pi.url FROM public.product_images pi
      WHERE pi.product_id = b.id
      ORDER BY pi.is_primary DESC, pi.sort_order ASC
      LIMIT 1
    ) AS primary_image_url,
    b.total_count
  FROM counted b
  ORDER BY
    CASE WHEN _sort = 'relevance'  AND v_query IS NOT NULL THEN b.rank END DESC NULLS LAST,
    CASE WHEN _sort = 'price_asc'  THEN b.price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN b.price END DESC NULLS LAST,
    CASE WHEN _sort = 'popular'    THEN b.views_count END DESC NULLS LAST,
    b.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

-- 5) Permissões: busca é pública (anon + authenticated)
REVOKE ALL ON FUNCTION public.search_products(text, text, numeric, numeric, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products(text, text, numeric, numeric, text, int, int) TO anon, authenticated;