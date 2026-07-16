
-- UNIQUE parcial (case-insensitive) para evitar variantes duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_lname
  ON public.product_variants (product_id, lower(name));

-- Constraints de qualidade
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_name_len CHECK (char_length(name) BETWEEN 1 AND 100) NOT VALID;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_sort_nonneg CHECK (sort_order >= 0) NOT VALID;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_price_adj_range
    CHECK (price_adjustment IS NULL OR (price_adjustment BETWEEN -1000000 AND 1000000)) NOT VALID;

ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_name_len;
ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_sort_nonneg;
ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_price_adj_range;
