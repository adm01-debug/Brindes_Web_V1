-- Etapa 16: Perguntas & Respostas públicas por produto
CREATE TABLE public.product_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asker_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  asker_name TEXT NOT NULL,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 1000),
  answer TEXT CHECK (answer IS NULL OR char_length(answer) BETWEEN 1 AND 2000),
  answered_at TIMESTAMPTZ,
  answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_questions TO authenticated;
GRANT ALL ON public.product_questions TO service_role;

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Público lê apenas perguntas respondidas
CREATE POLICY "Public reads answered questions"
  ON public.product_questions FOR SELECT
  TO anon, authenticated
  USING (status = 'answered');

-- Qualquer usuário autenticado pode fazer pergunta
CREATE POLICY "Authenticated can ask"
  ON public.product_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    asker_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.company_id = product_questions.company_id
        AND p.moderation_status = 'approved'
    )
  );

-- Dono da empresa lê todas (inclui pending) das suas perguntas
CREATE POLICY "Company owner reads own questions"
  ON public.product_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

-- Dono da empresa responde/atualiza
CREATE POLICY "Company owner answers"
  ON public.product_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

-- Autor pode apagar sua pergunta enquanto pendente
CREATE POLICY "Asker deletes own pending"
  ON public.product_questions FOR DELETE
  TO authenticated
  USING (asker_user_id = auth.uid() AND status = 'pending');

CREATE INDEX idx_pq_product_status ON public.product_questions(product_id, status, created_at DESC);
CREATE INDEX idx_pq_company_status ON public.product_questions(company_id, status, created_at DESC);

CREATE TRIGGER trg_pq_updated
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();