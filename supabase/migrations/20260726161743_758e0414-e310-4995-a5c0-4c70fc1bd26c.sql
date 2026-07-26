CREATE OR REPLACE FUNCTION public.suggest_search_terms(_q text, _limit integer DEFAULT 8)
RETURNS TABLE(kind text, label text, slug text, extra text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH q AS (
    SELECT public.unaccent_safe(NULLIF(btrim(coalesce(_q, '')), '')) AS term
  ),
  lim AS (SELECT LEAST(GREATEST(COALESCE(_limit, 8), 1), 20) AS n),
  prods AS (
    SELECT 'product'::text AS kind, p.name AS label, p.id::text AS slug,
           c.name AS extra,
           similarity(public.unaccent_safe(p.name), (SELECT term FROM q)) AS sim,
           p.views_count AS pop
    FROM public.products p
    JOIN public.companies c ON c.id = p.company_id
    WHERE (SELECT term FROM q) IS NOT NULL
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND p.moderation_status = 'approved'
      AND c.status = 'approved'
      AND public.unaccent_safe(p.name) ILIKE '%' || (SELECT term FROM q) || '%'
    ORDER BY sim DESC, p.views_count DESC NULLS LAST
    LIMIT (SELECT n FROM lim)
  ),
  cats AS (
    SELECT 'category'::text AS kind, cat.name AS label, cat.slug AS slug,
           NULL::text AS extra,
           similarity(public.unaccent_safe(cat.name), (SELECT term FROM q)) AS sim,
           0 AS pop
    FROM public.categories cat
    WHERE (SELECT term FROM q) IS NOT NULL
      AND cat.is_active = true
      AND public.unaccent_safe(cat.name) ILIKE '%' || (SELECT term FROM q) || '%'
    ORDER BY sim DESC
    LIMIT 4
  ),
  comps AS (
    SELECT 'company'::text AS kind, co.name AS label, co.slug AS slug,
           NULLIF(concat_ws('/', co.city, co.state), '') AS extra,
           similarity(public.unaccent_safe(co.name), (SELECT term FROM q)) AS sim,
           0 AS pop
    FROM public.companies co
    WHERE (SELECT term FROM q) IS NOT NULL
      AND co.status = 'approved'
      AND public.unaccent_safe(co.name) ILIKE '%' || (SELECT term FROM q) || '%'
    ORDER BY sim DESC
    LIMIT 4
  ),
  unioned AS (
    SELECT * FROM cats
    UNION ALL SELECT * FROM comps
    UNION ALL SELECT * FROM prods
  )
  SELECT u.kind, u.label, u.slug, u.extra
  FROM unioned u
  ORDER BY CASE u.kind WHEN 'category' THEN 0 WHEN 'company' THEN 1 ELSE 2 END,
           u.sim DESC NULLS LAST, u.pop DESC NULLS LAST
  LIMIT (SELECT n FROM lim);
$$;

REVOKE ALL ON FUNCTION public.suggest_search_terms(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_search_terms(text, integer) TO anon, authenticated;