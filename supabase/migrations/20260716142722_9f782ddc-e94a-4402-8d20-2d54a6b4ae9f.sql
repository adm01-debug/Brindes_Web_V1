
-- Normaliza slugs existentes antes de aplicar unique (defensivo)
UPDATE public.categories SET slug = lower(slug) WHERE slug <> lower(slug);

-- Índice UNIQUE case-insensitive (complementa unique existente)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug_lower
  ON public.categories (lower(slug));

-- Índice para árvore
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
  ON public.categories (parent_id, sort_order)
  WHERE is_active = true;

-- Constraints
ALTER TABLE public.categories
  ADD CONSTRAINT categories_sort_nonneg CHECK (sort_order >= 0) NOT VALID;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') NOT VALID;

ALTER TABLE public.categories VALIDATE CONSTRAINT categories_sort_nonneg;
ALTER TABLE public.categories VALIDATE CONSTRAINT categories_slug_format;
