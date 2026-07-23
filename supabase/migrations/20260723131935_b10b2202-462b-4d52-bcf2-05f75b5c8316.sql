
CREATE OR REPLACE FUNCTION public.compare_suppliers_by_category(_category_slug text)
RETURNS TABLE (
  company_id uuid,
  slug text,
  name text,
  tagline text,
  city text,
  state text,
  plan text,
  featured_until timestamptz,
  product_count bigint,
  avg_rating numeric,
  review_count bigint,
  min_price numeric,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cat AS (
    SELECT id FROM public.categories WHERE slug = _category_slug LIMIT 1
  ),
  prods AS (
    SELECT p.company_id,
           COUNT(*)::bigint AS product_count,
           MIN(NULLIF(p.price, 0)) AS min_price
    FROM public.products p
    WHERE p.category_id = (SELECT id FROM cat)
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND p.moderation_status = 'approved'
    GROUP BY p.company_id
  ),
  revs AS (
    SELECT r.company_id,
           ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
           COUNT(*)::bigint AS review_count
    FROM public.company_reviews r
    WHERE r.status = 'approved'
    GROUP BY r.company_id
  )
  SELECT c.id, c.slug, c.name, c.tagline, c.city, c.state,
         c.plan::text, c.featured_until,
         COALESCE(prods.product_count, 0),
         COALESCE(revs.avg_rating, 0),
         COALESCE(revs.review_count, 0),
         prods.min_price,
         c.logo_url
  FROM public.companies c
  JOIN prods ON prods.company_id = c.id
  LEFT JOIN revs ON revs.company_id = c.id
  WHERE c.status = 'approved'
  ORDER BY
    CASE c.plan::text WHEN 'premium' THEN 0 WHEN 'pro' THEN 1 ELSE 2 END,
    COALESCE(revs.avg_rating, 0) DESC,
    prods.product_count DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.compare_suppliers_by_category(text) FROM public;
GRANT EXECUTE ON FUNCTION public.compare_suppliers_by_category(text) TO anon, authenticated;
