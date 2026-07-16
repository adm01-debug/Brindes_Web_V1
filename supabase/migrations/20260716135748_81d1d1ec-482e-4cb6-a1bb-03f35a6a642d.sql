
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  quantity INTEGER,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','won','lost')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (length(name) BETWEEN 2 AND 120),
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CHECK (length(message) BETWEEN 10 AND 2000),
  CHECK (quantity IS NULL OR quantity > 0)
);

CREATE INDEX idx_leads_company_created ON public.leads (company_id, created_at DESC);
CREATE INDEX idx_leads_company_status ON public.leads (company_id, status);
CREATE INDEX idx_leads_product ON public.leads (product_id);

GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Visitantes (anon + auth) podem criar leads apenas para produtos aprovados de empresas aprovadas
CREATE POLICY "Qualquer um envia lead para produto visível"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.status = 'approved'
    )
    AND (
      leads.product_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = leads.product_id
          AND p.company_id = leads.company_id
          AND p.is_active = true
          AND p.deleted_at IS NULL
          AND p.moderation_status = 'approved'
      )
    )
  );

-- Donos veem leads da própria empresa
CREATE POLICY "Donos leem leads da empresa"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
  );

-- Admins veem tudo
CREATE POLICY "Admins leem todos os leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Donos atualizam status/read_at dos próprios leads
CREATE POLICY "Donos atualizam leads da empresa"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = leads.company_id AND c.owner_id = auth.uid()
    )
  );

-- updated_at automático
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
