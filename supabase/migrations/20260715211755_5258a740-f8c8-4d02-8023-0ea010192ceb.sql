
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS categories_is_active_idx ON public.categories (is_active);

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
