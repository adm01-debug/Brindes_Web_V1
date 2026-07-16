
CREATE INDEX IF NOT EXISTS idx_companies_pending_created
  ON public.companies (created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_products_pending_created
  ON public.products (created_at DESC)
  WHERE moderation_status = 'pending' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_company_status_created
  ON public.leads (company_id, status, created_at DESC);

ANALYZE public.companies;
ANALYZE public.products;
ANALYZE public.leads;
