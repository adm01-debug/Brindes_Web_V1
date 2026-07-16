
-- =========================================================
-- 1) SLUGS case-insensitive
-- =========================================================

-- Normaliza legado antes de criar índices únicos
UPDATE public.companies  SET slug = lower(trim(slug)) WHERE slug <> lower(trim(slug));
UPDATE public.categories SET slug = lower(trim(slug)) WHERE slug <> lower(trim(slug));
UPDATE public.products   SET slug = lower(trim(slug)) WHERE slug IS NOT NULL AND slug <> lower(trim(slug));

-- Companies: dropar unique existente e recriar case-insensitive
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.companies'::regclass AND contype = 'u'
             AND pg_get_constraintdef(oid) ILIKE '%(slug)%'
  LOOP EXECUTE format('ALTER TABLE public.companies DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
DROP INDEX IF EXISTS public.companies_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_lower_uniq ON public.companies (lower(slug));

-- Categories
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.categories'::regclass AND contype = 'u'
             AND pg_get_constraintdef(oid) ILIKE '%(slug)%'
  LOOP EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
DROP INDEX IF EXISTS public.categories_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_lower_uniq ON public.categories (lower(slug));

-- Products: unique composto (company_id, lower(slug))
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'public.products'::regclass AND contype = 'u'
             AND pg_get_constraintdef(oid) ILIKE '%(%slug%)%'
  LOOP EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
DROP INDEX IF EXISTS public.products_slug_key;
DROP INDEX IF EXISTS public.products_company_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_company_slug_lower_uniq
  ON public.products (company_id, lower(slug))
  WHERE slug IS NOT NULL;

-- Trigger de normalização
CREATE OR REPLACE FUNCTION public.slug_normalize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NOT NULL THEN
    NEW.slug := lower(trim(NEW.slug));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.slug_normalize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_companies_slug_normalize ON public.companies;
CREATE TRIGGER trg_companies_slug_normalize BEFORE INSERT OR UPDATE OF slug ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.slug_normalize();

DROP TRIGGER IF EXISTS trg_categories_slug_normalize ON public.categories;
CREATE TRIGGER trg_categories_slug_normalize BEFORE INSERT OR UPDATE OF slug ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.slug_normalize();

DROP TRIGGER IF EXISTS trg_products_slug_normalize ON public.products;
CREATE TRIGGER trg_products_slug_normalize BEFORE INSERT OR UPDATE OF slug ON public.products
FOR EACH ROW EXECUTE FUNCTION public.slug_normalize();

-- =========================================================
-- 2) RPC mark_leads_read
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_leads_read(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin');

  UPDATE public.leads l
     SET read_at = now()
   WHERE l.id = ANY(_ids)
     AND l.read_at IS NULL
     AND (
       v_is_admin
       OR EXISTS (
         SELECT 1 FROM public.companies c
          WHERE c.id = l.company_id AND c.owner_id = v_uid
       )
     );
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_leads_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_leads_read(uuid[]) TO authenticated;

-- =========================================================
-- 3) Hardening product_variants
-- =========================================================
CREATE OR REPLACE FUNCTION public.product_variants_sanitize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.strip_dangerous_html(trim(NEW.name));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.product_variants_sanitize() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_product_variants_sanitize ON public.product_variants;
CREATE TRIGGER trg_product_variants_sanitize
BEFORE INSERT OR UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.product_variants_sanitize();

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS pv_name_length_chk,
  DROP CONSTRAINT IF EXISTS pv_price_range_chk,
  DROP CONSTRAINT IF EXISTS pv_attributes_object_chk,
  DROP CONSTRAINT IF EXISTS pv_attributes_size_chk;

ALTER TABLE public.product_variants
  ADD CONSTRAINT pv_name_length_chk
    CHECK (char_length(name) BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT pv_price_range_chk
    CHECK (price_adjustment IS NULL OR price_adjustment BETWEEN -1000000 AND 1000000) NOT VALID,
  ADD CONSTRAINT pv_attributes_object_chk
    CHECK (attributes IS NULL OR jsonb_typeof(attributes) = 'object') NOT VALID,
  ADD CONSTRAINT pv_attributes_size_chk
    CHECK (attributes IS NULL OR pg_column_size(attributes) < 4096) NOT VALID;

DO $$
BEGIN
  BEGIN ALTER TABLE public.product_variants VALIDATE CONSTRAINT pv_name_length_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.product_variants VALIDATE CONSTRAINT pv_price_range_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.product_variants VALIDATE CONSTRAINT pv_attributes_object_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.product_variants VALIDATE CONSTRAINT pv_attributes_size_chk; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_sort
  ON public.product_variants (product_id, sort_order);
