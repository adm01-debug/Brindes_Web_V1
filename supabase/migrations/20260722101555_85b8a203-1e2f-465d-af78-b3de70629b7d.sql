
REVOKE EXECUTE ON FUNCTION public.companies_cleanup_assets() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.product_images_delete_storage() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.products_soft_delete_cascade_images() FROM anon, authenticated, PUBLIC;
