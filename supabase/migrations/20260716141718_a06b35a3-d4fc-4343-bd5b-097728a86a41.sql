
-- Índice de suporte
CREATE INDEX IF NOT EXISTS idx_leads_email_company_created
  ON public.leads (email, company_id, created_at DESC);

-- Constraints de tamanho e formato
ALTER TABLE public.leads
  ADD CONSTRAINT leads_name_len CHECK (char_length(name) BETWEEN 2 AND 150) NOT VALID;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_message_len CHECK (char_length(message) BETWEEN 5 AND 2000) NOT VALID;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') NOT VALID;

-- Rate limit trigger
CREATE OR REPLACE FUNCTION public.leads_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour_count INTEGER;
  v_day_count INTEGER;
BEGIN
  SELECT count(*) INTO v_hour_count
  FROM public.leads
  WHERE email = NEW.email
    AND company_id = NEW.company_id
    AND created_at > now() - interval '1 hour';

  IF v_hour_count >= 5 THEN
    RAISE EXCEPTION 'Limite de envios atingido. Aguarde antes de enviar novo contato.'
      USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_day_count
  FROM public.leads
  WHERE email = NEW.email
    AND company_id = NEW.company_id
    AND created_at > now() - interval '24 hours';

  IF v_day_count >= 20 THEN
    RAISE EXCEPTION 'Limite diário de contatos para esta empresa atingido.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.leads_rate_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS leads_rate_limit_trg ON public.leads;
CREATE TRIGGER leads_rate_limit_trg
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_rate_limit();
