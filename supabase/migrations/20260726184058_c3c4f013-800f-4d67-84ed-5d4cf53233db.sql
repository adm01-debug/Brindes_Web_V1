-- =========================================================
-- Etapa 1 — Motor de facetas (taxonomia multi-eixo)
-- =========================================================

-- 1) Eixos ------------------------------------------------
CREATE TABLE public.facet_axes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  hub_path      TEXT,
  seo_title     TEXT,
  seo_description TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facet_axes_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT facet_axes_name_len CHECK (char_length(btrim(name)) BETWEEN 2 AND 80)
);

GRANT SELECT ON public.facet_axes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facet_axes TO authenticated;
GRANT ALL ON public.facet_axes TO service_role;

ALTER TABLE public.facet_axes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facet_axes_public_read_active"
  ON public.facet_axes FOR SELECT
  USING (is_active = true);

CREATE POLICY "facet_axes_admin_all"
  ON public.facet_axes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_facet_axes_updated_at
  BEFORE UPDATE ON public.facet_axes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Termos -----------------------------------------------
CREATE TABLE public.facet_terms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_id       UUID NOT NULL REFERENCES public.facet_axes(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  icon          TEXT,
  cover_url     TEXT,
  description   TEXT,
  seo_title     TEXT,
  seo_description TEXT,
  keywords      TEXT[],
  month         SMALLINT,
  day           SMALLINT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facet_terms_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT facet_terms_name_len CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT facet_terms_month_range CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  CONSTRAINT facet_terms_day_range CHECK (day IS NULL OR day BETWEEN 1 AND 31),
  CONSTRAINT facet_terms_unique_slug_per_axis UNIQUE (axis_id, slug)
);

CREATE INDEX idx_facet_terms_axis_active
  ON public.facet_terms (axis_id, sort_order, name) WHERE is_active = true;

GRANT SELECT ON public.facet_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facet_terms TO authenticated;
GRANT ALL ON public.facet_terms TO service_role;

ALTER TABLE public.facet_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facet_terms_public_read_active"
  ON public.facet_terms FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.facet_axes a WHERE a.id = axis_id AND a.is_active = true)
  );

CREATE POLICY "facet_terms_admin_all"
  ON public.facet_terms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_facet_terms_updated_at
  BEFORE UPDATE ON public.facet_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- sanitização defensiva de textos livres
CREATE OR REPLACE FUNCTION public.facet_terms_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN NEW.name := public.strip_dangerous_html(btrim(NEW.name)); END IF;
  IF NEW.description IS NOT NULL THEN NEW.description := public.strip_dangerous_html(NEW.description); END IF;
  IF NEW.seo_title IS NOT NULL THEN NEW.seo_title := public.strip_dangerous_html(btrim(NEW.seo_title)); END IF;
  IF NEW.seo_description IS NOT NULL THEN NEW.seo_description := public.strip_dangerous_html(btrim(NEW.seo_description)); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_facet_terms_sanitize
  BEFORE INSERT OR UPDATE ON public.facet_terms
  FOR EACH ROW EXECUTE FUNCTION public.facet_terms_sanitize();


-- 3) Ponte produto <-> termo -------------------------------
CREATE TABLE public.product_facets (
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  term_id     UUID NOT NULL REFERENCES public.facet_terms(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, term_id)
);

-- índice inverso: dado um termo, listar produtos (rota de faceta)
CREATE INDEX idx_product_facets_term ON public.product_facets (term_id, product_id);

GRANT SELECT ON public.product_facets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_facets TO authenticated;
GRANT ALL ON public.product_facets TO service_role;

ALTER TABLE public.product_facets ENABLE ROW LEVEL SECURITY;

-- leitura pública apenas de produtos publicados/aprovados de empresas aprovadas
CREATE POLICY "product_facets_public_read"
  ON public.product_facets FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.products p
        JOIN public.companies c ON c.id = p.company_id
       WHERE p.id = product_id
         AND p.is_active = true
         AND p.deleted_at IS NULL
         AND p.moderation_status = 'approved'
         AND c.status = 'approved'
    )
  );

-- dono da empresa gerencia as facetas dos próprios produtos
CREATE POLICY "product_facets_owner_read"
  ON public.product_facets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
        JOIN public.companies c ON c.id = p.company_id
       WHERE p.id = product_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_facets_owner_write"
  ON public.product_facets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
        JOIN public.companies c ON c.id = p.company_id
       WHERE p.id = product_id AND c.owner_id = auth.uid() AND p.deleted_at IS NULL
    )
    AND EXISTS (SELECT 1 FROM public.facet_terms t WHERE t.id = term_id AND t.is_active = true)
  );

CREATE POLICY "product_facets_owner_delete"
  ON public.product_facets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
        JOIN public.companies c ON c.id = p.company_id
       WHERE p.id = product_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "product_facets_admin_all"
  ON public.product_facets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- limite defensivo: no máximo 24 facetas por produto
CREATE OR REPLACE FUNCTION public.product_facets_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.product_facets pf
   WHERE pf.product_id = NEW.product_id;

  IF v_count >= 24 THEN
    RAISE EXCEPTION 'Máximo de 24 facetas por produto.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_facets_limit
  BEFORE INSERT ON public.product_facets
  FOR EACH ROW EXECUTE FUNCTION public.product_facets_limit();


-- 4) Seed dos eixos ----------------------------------------
INSERT INTO public.facet_axes (slug, name, hub_path, seo_title, seo_description, sort_order)
VALUES
  ('categoria', 'Categoria', '/categorias',
   'Brindes por Categoria', 'Encontre brindes corporativos organizados por categoria de produto.', 10),
  ('evento', 'Evento', '/brindes-por-evento',
   'Brindes por Evento', 'Brindes personalizados ideais para feiras, congressos, formaturas e confraternizações.', 20),
  ('publico', 'Público-Alvo', '/brindes-por-publico-alvo',
   'Brindes por Público-Alvo', 'Brindes selecionados por perfil de quem recebe: clientes, executivos, colaboradores e mais.', 30),
  ('data', 'Data Promocional', '/brindes-por-data',
   'Brindes por Data Promocional', 'Brindes para Dia das Mães, Natal, Dia do Cliente e as principais datas do calendário promocional.', 40);


-- 5) Migração das datas comemorativas para o eixo "data" ----
INSERT INTO public.facet_terms (axis_id, slug, name, icon, description, keywords, month, day, sort_order, is_active)
SELECT
  (SELECT id FROM public.facet_axes WHERE slug = 'data'),
  cd.slug, cd.name, cd.icon, cd.description, cd.keywords, cd.month, cd.day, cd.sort_order, cd.is_active
FROM public.commemorative_dates cd
ON CONFLICT (axis_id, slug) DO NOTHING;

-- preserva as ligações produto <-> data já existentes
INSERT INTO public.product_facets (product_id, term_id)
SELECT pcd.product_id, ft.id
  FROM public.product_commemorative_dates pcd
  JOIN public.commemorative_dates cd ON cd.id = pcd.date_id
  JOIN public.facet_terms ft
    ON ft.slug = cd.slug
   AND ft.axis_id = (SELECT id FROM public.facet_axes WHERE slug = 'data')
ON CONFLICT DO NOTHING;
