-- 1) Datas comemorativas
CREATE TABLE public.commemorative_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  month smallint CHECK (month BETWEEN 1 AND 12),
  day smallint CHECK (day BETWEEN 1 AND 31),
  icon text,
  keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commemorative_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commemorative_dates TO authenticated;
GRANT ALL ON public.commemorative_dates TO service_role;

ALTER TABLE public.commemorative_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commemorative_dates_public_read"
  ON public.commemorative_dates FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "commemorative_dates_admin_write"
  ON public.commemorative_dates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_commemorative_dates_updated_at
  BEFORE UPDATE ON public.commemorative_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_commemorative_dates_active ON public.commemorative_dates (is_active, sort_order);

-- 2) Ligação produto <-> data comemorativa
CREATE TABLE public.product_commemorative_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  date_id uuid NOT NULL REFERENCES public.commemorative_dates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, date_id)
);

GRANT SELECT ON public.product_commemorative_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_commemorative_dates TO authenticated;
GRANT ALL ON public.product_commemorative_dates TO service_role;

ALTER TABLE public.product_commemorative_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcd_public_read"
  ON public.product_commemorative_dates FOR SELECT
  USING (true);

CREATE POLICY "pcd_owner_or_admin_write"
  ON public.product_commemorative_dates FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.id = product_commemorative_dates.product_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.companies c ON c.id = p.company_id
      WHERE p.id = product_commemorative_dates.product_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_pcd_date ON public.product_commemorative_dates (date_id);
CREATE INDEX idx_pcd_product ON public.product_commemorative_dates (product_id);

-- 3) Novos campos em produtos
ALTER TABLE public.products
  ADD COLUMN video_url text,
  ADD COLUMN is_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN promo_price numeric,
  ADD COLUMN is_unusual boolean NOT NULL DEFAULT false;

CREATE INDEX idx_products_clearance ON public.products (is_clearance) WHERE is_clearance = true;
CREATE INDEX idx_products_unusual ON public.products (is_unusual) WHERE is_unusual = true;
CREATE INDEX idx_products_video ON public.products (id) WHERE video_url IS NOT NULL;

-- 4) Departamento no lead
ALTER TABLE public.leads ADD COLUMN department text;