-- Qualidade de dados em products
ALTER TABLE public.products
  ADD CONSTRAINT products_price_nonneg CHECK (price IS NULL OR price >= 0) NOT VALID,
  ADD CONSTRAINT products_moq_positive CHECK (min_order_quantity IS NULL OR min_order_quantity > 0) NOT VALID,
  ADD CONSTRAINT products_prodtime_nonneg CHECK (production_time_days IS NULL OR production_time_days >= 0) NOT VALID,
  ADD CONSTRAINT products_weight_nonneg CHECK (weight_grams IS NULL OR weight_grams >= 0) NOT VALID,
  ADD CONSTRAINT products_views_nonneg CHECK (views_count >= 0) NOT VALID,
  ADD CONSTRAINT products_currency_iso CHECK (currency ~ '^[A-Z]{3}$') NOT VALID;

-- Valida linhas atuais (rápido — tabela pequena)
ALTER TABLE public.products VALIDATE CONSTRAINT products_price_nonneg;
ALTER TABLE public.products VALIDATE CONSTRAINT products_moq_positive;
ALTER TABLE public.products VALIDATE CONSTRAINT products_prodtime_nonneg;
ALTER TABLE public.products VALIDATE CONSTRAINT products_weight_nonneg;
ALTER TABLE public.products VALIDATE CONSTRAINT products_views_nonneg;
ALTER TABLE public.products VALIDATE CONSTRAINT products_currency_iso;

-- Qualidade de email em companies (quando preenchido)
ALTER TABLE public.companies
  ADD CONSTRAINT companies_email_format
  CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID;
ALTER TABLE public.companies VALIDATE CONSTRAINT companies_email_format;

-- Utilitário de retenção do log de auditoria (chamável manualmente ou por cron futuro)
CREATE OR REPLACE FUNCTION public.audit_log_purge(_older_than_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.audit_log
   WHERE created_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Executável apenas via service_role (mantém superfície pública mínima)
REVOKE ALL ON FUNCTION public.audit_log_purge(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_purge(integer) TO service_role;