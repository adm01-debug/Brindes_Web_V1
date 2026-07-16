
DROP INDEX IF EXISTS public.idx_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_audit_log_actor;
DROP INDEX IF EXISTS public.idx_audit_log_entity;

DROP INDEX IF EXISTS public.idx_product_views_product;
DROP INDEX IF EXISTS public.idx_product_views_product_date;

DROP INDEX IF EXISTS public.idx_product_images_product;

ANALYZE public.audit_log;
ANALYZE public.product_views;
ANALYZE public.product_images;
