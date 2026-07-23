
CREATE TABLE public.company_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, author_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_reviews TO authenticated;
GRANT SELECT ON public.company_reviews TO anon;
GRANT ALL ON public.company_reviews TO service_role;

ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;

-- Público: só aprovadas
CREATE POLICY "Public can view approved reviews"
  ON public.company_reviews FOR SELECT
  USING (status = 'approved');

-- Autor: vê as próprias
CREATE POLICY "Authors view own reviews"
  ON public.company_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Autor: cria (sempre pending)
CREATE POLICY "Authors insert own reviews"
  ON public.company_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id AND status = 'pending');

-- Autor: edita a própria (mantém pending)
CREATE POLICY "Authors update own pending reviews"
  ON public.company_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending')
  WITH CHECK (auth.uid() = author_id AND status = 'pending');

-- Autor: deleta a própria
CREATE POLICY "Authors delete own reviews"
  ON public.company_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Dono da empresa vê tudo dela
CREATE POLICY "Company owners view their reviews"
  ON public.company_reviews FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

-- Admin gerencia tudo
CREATE POLICY "Admins manage reviews"
  ON public.company_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER trg_company_reviews_updated_at
  BEFORE UPDATE ON public.company_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sanitize
CREATE OR REPLACE FUNCTION public.company_reviews_sanitize()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.author_name IS NOT NULL THEN
    NEW.author_name := public.strip_dangerous_html(trim(NEW.author_name));
  END IF;
  IF NEW.title IS NOT NULL THEN NEW.title := public.strip_dangerous_html(trim(NEW.title)); END IF;
  IF NEW.comment IS NOT NULL THEN NEW.comment := public.strip_dangerous_html(NEW.comment); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_company_reviews_sanitize
  BEFORE INSERT OR UPDATE ON public.company_reviews
  FOR EACH ROW EXECUTE FUNCTION public.company_reviews_sanitize();

-- Índices
CREATE INDEX idx_company_reviews_company_approved
  ON public.company_reviews (company_id, created_at DESC)
  WHERE status = 'approved';

CREATE INDEX idx_company_reviews_pending
  ON public.company_reviews (created_at DESC)
  WHERE status = 'pending';

CREATE INDEX idx_company_reviews_author ON public.company_reviews (author_id);

-- Agregação
CREATE OR REPLACE FUNCTION public.get_company_rating(_company_id UUID)
RETURNS TABLE(average NUMERIC, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ROUND(AVG(rating)::numeric, 2) AS average, COUNT(*)::bigint AS total
  FROM public.company_reviews
  WHERE company_id = _company_id AND status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION public.get_company_rating(UUID) TO anon, authenticated;
