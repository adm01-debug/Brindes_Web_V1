
-- Revoke public execute on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unaccent_safe(TEXT) FROM PUBLIC, anon, authenticated;

-- has_role stays callable by signed-in users (used by policies)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Tighten product_views insert policy: only for visible products
DROP POLICY IF EXISTS "Anyone can log a view" ON public.product_views;

CREATE POLICY "Anyone can log a view for visible products"
  ON public.product_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.id = product_views.product_id
        AND p.is_active = true
        AND p.deleted_at IS NULL
        AND c.status = 'approved'
    )
  );
