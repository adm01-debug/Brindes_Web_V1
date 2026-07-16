-- 1) Badge de leads não lidos (painel): count(*) WHERE company_id=? AND read_at IS NULL
CREATE INDEX IF NOT EXISTS idx_leads_company_unread
  ON public.leads (company_id)
  WHERE read_at IS NULL;

-- 2) Lookup de imagem primária em search_products / listagens
--    ORDER BY is_primary DESC, sort_order ASC LIMIT 1 por product_id
CREATE INDEX IF NOT EXISTS idx_product_images_primary_lookup
  ON public.product_images (product_id, is_primary DESC, sort_order ASC);

-- 3) Atualiza estatísticas do planejador para as tabelas mais consultadas
ANALYZE public.leads;
ANALYZE public.products;
ANALYZE public.product_images;
ANALYZE public.companies;
ANALYZE public.product_views;