DROP POLICY IF EXISTS "Embeddings são legíveis por todos" ON public.product_embeddings;

CREATE POLICY "Embeddings visíveis apenas de produtos publicados"
ON public.product_embeddings
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.companies c ON c.id = p.company_id
    WHERE p.id = product_embeddings.product_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND p.moderation_status = 'approved'
      AND c.status = 'approved'
  )
);