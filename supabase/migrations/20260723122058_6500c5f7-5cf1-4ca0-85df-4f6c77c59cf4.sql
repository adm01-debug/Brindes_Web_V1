
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorites_target_check CHECK (
    (product_id IS NOT NULL AND company_id IS NULL) OR
    (product_id IS NULL AND company_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX favorites_user_product_uniq ON public.favorites(user_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX favorites_user_company_uniq ON public.favorites(user_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX favorites_user_created_idx ON public.favorites(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites select" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users manage own favorites insert" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own favorites delete" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
