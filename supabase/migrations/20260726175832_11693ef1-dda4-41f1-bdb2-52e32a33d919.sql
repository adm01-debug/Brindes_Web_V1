CREATE TABLE public.product_price_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty integer NOT NULL,
  max_qty integer,
  unit_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppt_min_qty_chk CHECK (min_qty >= 1 AND min_qty <= 100000000),
  CONSTRAINT ppt_max_qty_chk CHECK (max_qty IS NULL OR (max_qty > min_qty AND max_qty <= 100000000)),
  CONSTRAINT ppt_unit_price_chk CHECK (unit_price >= 0 AND unit_price <= 10000000)
);

GRANT SELECT ON public.product_price_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_price_tiers TO authenticated;
GRANT ALL ON public.product_price_tiers TO service_role;

ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tiers of visible products"
ON public.product_price_tiers
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = product_price_tiers.product_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND p.moderation_status = 'approved'
    AND c.status = 'approved'
));

CREATE POLICY "Owners can manage their product price tiers"
ON public.product_price_tiers
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = product_price_tiers.product_id AND c.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = product_price_tiers.product_id AND c.owner_id = auth.uid()
));

CREATE UNIQUE INDEX uq_product_price_tiers_product_min
  ON public.product_price_tiers (product_id, min_qty);
CREATE INDEX idx_product_price_tiers_product_qty
  ON public.product_price_tiers (product_id, min_qty ASC);

CREATE OR REPLACE FUNCTION public.product_price_tiers_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.product_price_tiers t
   WHERE t.product_id = NEW.product_id
     AND t.id <> NEW.id;

  IF v_count >= 8 THEN
    RAISE EXCEPTION 'Máximo de 8 faixas de preço por produto.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_price_tiers t
     WHERE t.product_id = NEW.product_id
       AND t.id <> NEW.id
       AND int4range(NEW.min_qty, COALESCE(NEW.max_qty, 100000000), '[]')
           && int4range(t.min_qty, COALESCE(t.max_qty, 100000000), '[]')
  ) THEN
    RAISE EXCEPTION 'Faixas de quantidade sobrepostas não são permitidas.' USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_price_tiers_validate
BEFORE INSERT OR UPDATE ON public.product_price_tiers
FOR EACH ROW EXECUTE FUNCTION public.product_price_tiers_validate();