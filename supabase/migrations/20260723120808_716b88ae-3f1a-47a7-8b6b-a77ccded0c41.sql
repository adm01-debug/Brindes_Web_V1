-- Kits temáticos: agrupamento curatorial de produtos
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  cover_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kits_name_len CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT kits_slug_fmt CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE public.kit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  suggested_quantity INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kit_id, product_id),
  CONSTRAINT kit_items_qty_pos CHECK (suggested_quantity IS NULL OR suggested_quantity > 0)
);

CREATE INDEX idx_kits_active_sort ON public.kits (is_active, sort_order) WHERE is_active = true;
CREATE INDEX idx_kit_items_kit ON public.kit_items (kit_id, sort_order);
CREATE INDEX idx_kit_items_product ON public.kit_items (product_id);

GRANT SELECT ON public.kits TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;

GRANT SELECT ON public.kit_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

-- Kits: público lê apenas ativos; admin CRUD total
CREATE POLICY "Public reads active kits"
  ON public.kits FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage kits"
  ON public.kits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Kit items: público lê itens de kits ativos; admin CRUD
CREATE POLICY "Public reads items of active kits"
  ON public.kit_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND (k.is_active = true OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Admins manage kit items"
  ON public.kit_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER trg_kits_updated_at
  BEFORE UPDATE ON public.kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Slug normalize
CREATE TRIGGER trg_kits_slug_normalize
  BEFORE INSERT OR UPDATE OF slug ON public.kits
  FOR EACH ROW EXECUTE FUNCTION public.slug_normalize();

-- Sanitize
CREATE OR REPLACE FUNCTION public.kits_sanitize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN NEW.name := public.strip_dangerous_html(trim(NEW.name)); END IF;
  IF NEW.tagline IS NOT NULL THEN NEW.tagline := public.strip_dangerous_html(NEW.tagline); END IF;
  IF NEW.description IS NOT NULL THEN NEW.description := public.strip_dangerous_html(NEW.description); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kits_sanitize
  BEFORE INSERT OR UPDATE ON public.kits
  FOR EACH ROW EXECUTE FUNCTION public.kits_sanitize();

-- Seed inicial de exemplo (kits vazios que admin pode popular depois)
INSERT INTO public.kits (slug, name, tagline, description, sort_order) VALUES
  ('boas-vindas', 'Kit Boas-vindas', 'Receba novos colaboradores com estilo', 'Combinação curatorial para onboarding: caneca, caderno, caneta e ecobag personalizados.', 1),
  ('eventos-corporativos', 'Kit Eventos Corporativos', 'Presentes para participantes de eventos', 'Kit completo para brindar em congressos, feiras e workshops.', 2),
  ('sustentavel', 'Kit Sustentável', 'Brindes ecológicos e reutilizáveis', 'Seleção de produtos com materiais reciclados e reutilizáveis para empresas ESG.', 3),
  ('fim-de-ano', 'Kit Fim de Ano', 'Presentes de Natal e confraternizações', 'Ideias premium para presentear clientes e colaboradores nas festividades.', 4)
ON CONFLICT (slug) DO NOTHING;