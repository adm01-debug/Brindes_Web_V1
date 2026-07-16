
-- =========================================================
-- 1. pg_cron + pg_net
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Agendamentos idempotentes
DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'metrics_daily_snapshot_job',
    'refresh_company_stats_job',
    'product_views_purge_job',
    'audit_log_purge_job',
    'leads_purge_job'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

SELECT cron.schedule('metrics_daily_snapshot_job', '0 3 * * *',  $$SELECT public.metrics_daily_snapshot();$$);
SELECT cron.schedule('refresh_company_stats_job', '*/30 * * * *', $$SELECT public.refresh_company_stats();$$);
SELECT cron.schedule('product_views_purge_job',   '15 3 * * *',   $$SELECT public.product_views_purge(90);$$);
SELECT cron.schedule('audit_log_purge_job',       '30 3 * * 0',   $$SELECT public.audit_log_purge(365);$$);
SELECT cron.schedule('leads_purge_job',           '45 3 1 * *',   $$SELECT public.leads_purge(730);$$);

-- =========================================================
-- 2. Extração de path a partir de URL do bucket
-- =========================================================
CREATE OR REPLACE FUNCTION public.extract_storage_path(_url text, _bucket text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_marker text;
  v_idx int;
  v_path text;
BEGIN
  IF _url IS NULL OR _bucket IS NULL THEN RETURN NULL; END IF;
  v_marker := '/' || _bucket || '/';
  v_idx := position(v_marker in _url);
  IF v_idx = 0 THEN RETURN NULL; END IF;
  v_path := substring(_url from v_idx + length(v_marker));
  -- remove query string
  v_path := split_part(v_path, '?', 1);
  IF v_path = '' THEN RETURN NULL; END IF;
  RETURN v_path;
END;
$$;

-- =========================================================
-- 3. Trigger: apagar objeto do bucket product-images ao deletar product_images
-- =========================================================
CREATE OR REPLACE FUNCTION public.product_images_delete_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  BEGIN
    v_path := public.extract_storage_path(OLD.url, 'product-images');
    IF v_path IS NOT NULL THEN
      DELETE FROM storage.objects
       WHERE bucket_id = 'product-images'
         AND name = v_path;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_images_delete_storage ON public.product_images;
CREATE TRIGGER trg_product_images_delete_storage
AFTER DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.product_images_delete_storage();

-- =========================================================
-- 4. Trigger: soft delete de produto remove imagens (cascata via trigger acima)
-- =========================================================
CREATE OR REPLACE FUNCTION public.products_soft_delete_cascade_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.deleted_at IS NULL) AND (NEW.deleted_at IS NOT NULL) THEN
    DELETE FROM public.product_images WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_soft_delete_cascade_images ON public.products;
CREATE TRIGGER trg_products_soft_delete_cascade_images
AFTER UPDATE OF deleted_at ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_soft_delete_cascade_images();

-- =========================================================
-- 5. Trigger: apagar logo/banner antigos ao trocar em companies
-- =========================================================
CREATE OR REPLACE FUNCTION public.companies_cleanup_assets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.logo_url IS DISTINCT FROM NEW.logo_url AND OLD.logo_url IS NOT NULL THEN
      BEGIN
        v_path := public.extract_storage_path(OLD.logo_url, 'company-assets');
        IF v_path IS NOT NULL THEN
          DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    IF OLD.banner_url IS DISTINCT FROM NEW.banner_url AND OLD.banner_url IS NOT NULL THEN
      BEGIN
        v_path := public.extract_storage_path(OLD.banner_url, 'company-assets');
        IF v_path IS NOT NULL THEN
          DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    BEGIN
      v_path := public.extract_storage_path(OLD.logo_url, 'company-assets');
      IF v_path IS NOT NULL THEN
        DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
      END IF;
      v_path := public.extract_storage_path(OLD.banner_url, 'company-assets');
      IF v_path IS NOT NULL THEN
        DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_cleanup_assets_upd ON public.companies;
CREATE TRIGGER trg_companies_cleanup_assets_upd
AFTER UPDATE OF logo_url, banner_url ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.companies_cleanup_assets();

DROP TRIGGER IF EXISTS trg_companies_cleanup_assets_del ON public.companies;
CREATE TRIGGER trg_companies_cleanup_assets_del
AFTER DELETE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.companies_cleanup_assets();

-- =========================================================
-- 6. Purge de órfãos (admin-only, chamada manual)
-- =========================================================
CREATE OR REPLACE FUNCTION public.storage_purge_orphans(_bucket text DEFAULT 'product-images', _limit int DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
BEGIN
  IF _bucket = 'product-images' THEN
    WITH candidates AS (
      SELECT o.name
        FROM storage.objects o
       WHERE o.bucket_id = 'product-images'
       LIMIT _limit
    ),
    orphans AS (
      SELECT c.name FROM candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM public.product_images pi
          WHERE public.extract_storage_path(pi.url, 'product-images') = c.name
       )
    )
    DELETE FROM storage.objects o
     USING orphans
     WHERE o.bucket_id = 'product-images' AND o.name = orphans.name;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

  ELSIF _bucket = 'company-assets' THEN
    WITH candidates AS (
      SELECT o.name
        FROM storage.objects o
       WHERE o.bucket_id = 'company-assets'
       LIMIT _limit
    ),
    orphans AS (
      SELECT c.name FROM candidates c
       WHERE NOT EXISTS (
         SELECT 1 FROM public.companies co
          WHERE public.extract_storage_path(co.logo_url, 'company-assets') = c.name
             OR public.extract_storage_path(co.banner_url, 'company-assets') = c.name
       )
    )
    DELETE FROM storage.objects o
     USING orphans
     WHERE o.bucket_id = 'company-assets' AND o.name = orphans.name;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Bucket não suportado: %', _bucket USING ERRCODE = '22023';
  END IF;

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_purge_orphans(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_purge_orphans(text, int) TO service_role;
REVOKE ALL ON FUNCTION public.extract_storage_path(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extract_storage_path(text, text) TO authenticated, service_role;
