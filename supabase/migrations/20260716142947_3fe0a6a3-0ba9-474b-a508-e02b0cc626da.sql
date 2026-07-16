
CREATE OR REPLACE FUNCTION public.strip_dangerous_html(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v TEXT := input;
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  -- Remove tags perigosas inteiras (com conteúdo)
  v := regexp_replace(v, '<\s*(script|iframe|object|embed|style|link|meta|form)\b[^>]*>.*?<\s*/\s*\1\s*>', '', 'gi');
  -- Remove tags perigosas auto-fechadas ou sem par
  v := regexp_replace(v, '<\s*(script|iframe|object|embed|style|link|meta|form)\b[^>]*/?>', '', 'gi');
  -- Remove handlers de evento (onload=, onclick=, etc.)
  v := regexp_replace(v, '\s*on[a-z]+\s*=\s*"[^"]*"', '', 'gi');
  v := regexp_replace(v, '\s*on[a-z]+\s*=\s*''[^'']*''', '', 'gi');
  v := regexp_replace(v, '\s*on[a-z]+\s*=\s*[^\s>]+', '', 'gi');
  -- Neutraliza javascript: em href/src
  v := regexp_replace(v, '(href|src)\s*=\s*"\s*javascript:[^"]*"', '\1="#"', 'gi');
  v := regexp_replace(v, '(href|src)\s*=\s*''\s*javascript:[^'']*''', '\1="#"', 'gi');
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.strip_dangerous_html(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.strip_dangerous_html(TEXT) TO anon, authenticated, service_role;

-- Trigger products
CREATE OR REPLACE FUNCTION public.products_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := public.strip_dangerous_html(NEW.name);
  NEW.short_description := public.strip_dangerous_html(NEW.short_description);
  NEW.description := public.strip_dangerous_html(NEW.description);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.products_sanitize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_sanitize_trg ON public.products;
CREATE TRIGGER products_sanitize_trg
  BEFORE INSERT OR UPDATE OF name, short_description, description ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_sanitize();

-- Trigger companies
CREATE OR REPLACE FUNCTION public.companies_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := public.strip_dangerous_html(NEW.name);
  NEW.tagline := public.strip_dangerous_html(NEW.tagline);
  NEW.description := public.strip_dangerous_html(NEW.description);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.companies_sanitize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS companies_sanitize_trg ON public.companies;
CREATE TRIGGER companies_sanitize_trg
  BEFORE INSERT OR UPDATE OF name, tagline, description ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_sanitize();
