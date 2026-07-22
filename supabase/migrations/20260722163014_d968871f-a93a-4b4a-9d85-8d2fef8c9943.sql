-- 1) product_variants: alinhar policy pública a product_images (exigir moderação aprovada)
DROP POLICY IF EXISTS "Public can view variants of visible products" ON public.product_variants;
CREATE POLICY "Public can view variants of visible products"
ON public.product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.companies c ON c.id = p.company_id
    WHERE p.id = product_variants.product_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND p.moderation_status = 'approved'
      AND c.status = 'approved'
  )
);

-- 2) web_vitals_rollup: remover EXECUTE público (mantém postgres/service_role)
REVOKE EXECUTE ON FUNCTION public.web_vitals_rollup(date) FROM PUBLIC;
