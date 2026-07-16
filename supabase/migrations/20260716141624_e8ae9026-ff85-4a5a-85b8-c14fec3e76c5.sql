
CREATE INDEX IF NOT EXISTS idx_product_views_product_viewed_at
  ON public.product_views (product_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at
  ON public.product_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_active_approved_created
  ON public.products (created_at DESC)
  WHERE is_active = true AND deleted_at IS NULL AND moderation_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_leads_company_created
  ON public.leads (company_id, created_at DESC);

ANALYZE public.product_views;
ANALYZE public.products;
ANALYZE public.leads;
