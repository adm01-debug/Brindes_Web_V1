-- QA #3: fecha vazamento — só mostrar imagens de produtos moderados/aprovados
DROP POLICY IF EXISTS "Public can view images of visible products" ON public.product_images;

CREATE POLICY "Public can view images of visible products"
ON public.product_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1
      FROM public.products p
      JOIN public.companies c ON c.id = p.company_id
     WHERE p.id = product_images.product_id
       AND p.is_active = true
       AND p.deleted_at IS NULL
       AND p.moderation_status = 'approved'
       AND c.status = 'approved'
  )
);