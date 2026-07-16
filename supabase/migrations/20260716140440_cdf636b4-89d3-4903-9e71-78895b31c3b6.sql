-- Hardening: revoke EXECUTE from trigger-only SECURITY DEFINER functions.
-- These are invoked exclusively by triggers/system paths — no signed-in
-- user should ever call them directly.
REVOKE EXECUTE ON FUNCTION public.companies_guard_owner_update()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.products_guard_owner_update()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.product_views_dedupe()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.product_views_increment()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_companies_status()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_products_moderation()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()       FROM PUBLIC, anon, authenticated;

-- Ensure the functions truly needed by clients/RLS stay callable.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.unaccent_safe(text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(text, text, numeric, numeric, text, integer, integer) TO anon, authenticated;
