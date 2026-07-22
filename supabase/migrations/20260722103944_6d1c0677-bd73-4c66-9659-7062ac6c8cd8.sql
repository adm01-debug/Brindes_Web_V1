
-- Índices compostos para hot-paths PostgREST (listagem de empresas ativas e categorias raiz)
CREATE INDEX IF NOT EXISTS idx_companies_status_created_at
  ON public.companies (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
  ON public.categories (parent_id, sort_order ASC)
  WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_company_active
  ON public.products (company_id, is_active, moderation_status)
  WHERE deleted_at IS NULL;

ANALYZE public.companies;
ANALYZE public.categories;
ANALYZE public.products;
