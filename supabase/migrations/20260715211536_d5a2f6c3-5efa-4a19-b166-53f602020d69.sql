
DO $$ BEGIN
  CREATE TYPE public.product_moderation_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS moderation_status public.product_moderation_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid;

CREATE INDEX IF NOT EXISTS products_moderation_status_idx ON public.products (moderation_status);

DROP POLICY IF EXISTS "Public can view active products from approved companies" ON public.products;
CREATE POLICY "Public can view active products from approved companies"
ON public.products
FOR SELECT
USING (
  is_active = true
  AND deleted_at IS NULL
  AND moderation_status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = products.company_id AND c.status = 'approved'
  )
);
