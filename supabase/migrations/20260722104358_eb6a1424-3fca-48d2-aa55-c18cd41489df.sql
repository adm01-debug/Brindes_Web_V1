
-- Duplicado exato de idx_leads_company_unread
DROP INDEX IF EXISTS public.idx_leads_unread;

-- Prefixo de idx_leads_company_status_created (company_id, status, created_at DESC)
DROP INDEX IF EXISTS public.idx_leads_company_status;

-- Dominado por idx_product_views_viewed_at (viewed_at DESC) — DESC serve ambas direções
DROP INDEX IF EXISTS public.idx_product_views_date;

-- Dominado por idx_products_active_approved_created (WHERE mais específico + coluna útil)
DROP INDEX IF EXISTS public.idx_products_active;

ANALYZE public.leads;
ANALYZE public.product_views;
ANALYZE public.products;
