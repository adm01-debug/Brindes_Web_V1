
-- 1) Trigger de sanitização/normalização (roda ANTES dos CHECKs)
CREATE OR REPLACE FUNCTION public.leads_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.strip_dangerous_html(regexp_replace(trim(NEW.name), '\s+', ' ', 'g'));
  END IF;
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(trim(NEW.phone), '\s+', ' ', 'g');
    IF NEW.phone = '' THEN NEW.phone := NULL; END IF;
  END IF;
  IF NEW.message IS NOT NULL THEN
    NEW.message := public.strip_dangerous_html(NEW.message);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.leads_sanitize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_leads_sanitize ON public.leads;
CREATE TRIGGER trg_leads_sanitize
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_sanitize();

-- 2) CHECK constraints (NOT VALID para não travar dados legados; VALIDATE depois)
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_name_length_chk,
  DROP CONSTRAINT IF EXISTS leads_email_format_chk,
  DROP CONSTRAINT IF EXISTS leads_phone_format_chk,
  DROP CONSTRAINT IF EXISTS leads_message_length_chk,
  DROP CONSTRAINT IF EXISTS leads_quantity_range_chk,
  DROP CONSTRAINT IF EXISTS leads_status_chk;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_name_length_chk
    CHECK (char_length(name) BETWEEN 2 AND 150) NOT VALID,
  ADD CONSTRAINT leads_email_format_chk
    CHECK (char_length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID,
  ADD CONSTRAINT leads_phone_format_chk
    CHECK (phone IS NULL OR (char_length(phone) BETWEEN 8 AND 20 AND phone ~ '^[0-9+\-()\s]+$')) NOT VALID,
  ADD CONSTRAINT leads_message_length_chk
    CHECK (char_length(message) BETWEEN 10 AND 5000) NOT VALID,
  ADD CONSTRAINT leads_quantity_range_chk
    CHECK (quantity IS NULL OR (quantity BETWEEN 1 AND 1000000)) NOT VALID,
  ADD CONSTRAINT leads_status_chk
    CHECK (status IN ('new','contacted','won','lost','archived')) NOT VALID;

-- Tenta validar apenas se dados legados forem compatíveis (silencioso se falhar)
DO $$
BEGIN
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_name_length_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_email_format_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_phone_format_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_message_length_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_quantity_range_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.leads VALIDATE CONSTRAINT leads_status_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 3) Retenção LGPD
CREATE OR REPLACE FUNCTION public.leads_purge(_older_than_days integer DEFAULT 730)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.leads
   WHERE created_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.leads_purge(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leads_purge(integer) TO service_role;

-- 4) Índices de performance
CREATE INDEX IF NOT EXISTS idx_leads_company_created
  ON public.leads (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_unread
  ON public.leads (company_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_company_created
  ON public.leads (email, company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_company_active
  ON public.products (company_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort
  ON public.product_images (product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_companies_owner
  ON public.companies (owner_id);
