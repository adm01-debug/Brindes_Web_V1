
CREATE OR REPLACE FUNCTION public.search_companies(
  _q TEXT DEFAULT NULL,
  _state TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _sort TEXT DEFAULT 'relevance',
  _page INTEGER DEFAULT 1,
  _page_size INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  tagline TEXT,
  logo_url TEXT,
  banner_url TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ,
  products_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_limit INT;
  v_q TEXT;
BEGIN
  v_limit := least(greatest(coalesce(_page_size, 24), 1), 60);
  v_offset := greatest((coalesce(_page, 1) - 1) * v_limit, 0);
  v_q := NULLIF(trim(coalesce(_q, '')), '');

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id, c.slug, c.name, c.tagline, c.logo_url, c.banner_url,
      c.city, c.state, c.created_at,
      CASE
        WHEN v_q IS NOT NULL
        THEN similarity(public.unaccent_safe(c.name), public.unaccent_safe(v_q))
        ELSE 0
      END AS sim
    FROM public.companies c
    WHERE c.status = 'approved'
      AND (v_q IS NULL
           OR public.unaccent_safe(c.name) ILIKE '%' || public.unaccent_safe(v_q) || '%'
           OR similarity(public.unaccent_safe(c.name), public.unaccent_safe(v_q)) > 0.15)
      AND (_state IS NULL OR c.state = _state)
      AND (_city IS NULL OR c.city = _city)
  ),
  counted AS (SELECT b.*, count(*) OVER () AS total_count FROM base b)
  SELECT
    b.id, b.slug, b.name, b.tagline, b.logo_url, b.banner_url,
    b.city, b.state, b.created_at,
    (SELECT count(*) FROM public.products p
       WHERE p.company_id = b.id
         AND p.deleted_at IS NULL
         AND p.is_active = true
         AND p.moderation_status = 'approved') AS products_count,
    b.total_count
  FROM counted b
  ORDER BY
    CASE WHEN _sort = 'relevance' AND v_q IS NOT NULL THEN b.sim END DESC NULLS LAST,
    CASE WHEN _sort = 'name' THEN b.name END ASC NULLS LAST,
    b.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_companies(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;
