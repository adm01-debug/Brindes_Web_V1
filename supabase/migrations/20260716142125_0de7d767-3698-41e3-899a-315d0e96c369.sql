
CREATE INDEX IF NOT EXISTS companies_name_trgm_idx
  ON public.companies USING gin (public.unaccent_safe(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_status_name
  ON public.companies (status, name);

ANALYZE public.companies;
