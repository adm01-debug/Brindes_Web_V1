
-- 1) Fila de retry
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);

GRANT ALL ON public.storage_cleanup_queue TO service_role;

ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no direct access" ON public.storage_cleanup_queue;
CREATE POLICY "no direct access" ON public.storage_cleanup_queue
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_queue_next
  ON public.storage_cleanup_queue (next_attempt_at)
  WHERE attempts < 10;

-- 2) Helper de enfileiramento
CREATE OR REPLACE FUNCTION public.storage_cleanup_enqueue(_bucket TEXT, _path TEXT, _err TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _bucket IS NULL OR _path IS NULL THEN RETURN; END IF;
  INSERT INTO public.storage_cleanup_queue (bucket, path, last_error, next_attempt_at)
  VALUES (_bucket, _path, _err, now())
  ON CONFLICT (bucket, path) DO UPDATE
    SET last_error = COALESCE(EXCLUDED.last_error, public.storage_cleanup_queue.last_error),
        next_attempt_at = LEAST(public.storage_cleanup_queue.next_attempt_at, now());
END;
$$;

REVOKE ALL ON FUNCTION public.storage_cleanup_enqueue(TEXT, TEXT, TEXT) FROM PUBLIC;

-- 3) Triggers reescritos
CREATE OR REPLACE FUNCTION public.product_images_delete_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_deleted int := 0;
BEGIN
  v_path := public.extract_storage_path(OLD.url, 'product-images');
  IF v_path IS NULL THEN RETURN OLD; END IF;

  BEGIN
    DELETE FROM storage.objects
     WHERE bucket_id = 'product-images' AND name = v_path;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    IF v_deleted = 0 THEN
      -- objeto pode não existir ou já ter sido removido; ainda enfileira caso ainda esteja lá
      IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-images' AND name = v_path) THEN
        PERFORM public.storage_cleanup_enqueue('product-images', v_path, 'delete affected 0 rows but object still exists');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.storage_cleanup_enqueue('product-images', v_path, SQLERRM);
  END;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.companies_cleanup_assets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_deleted int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.logo_url IS DISTINCT FROM NEW.logo_url AND OLD.logo_url IS NOT NULL THEN
      v_path := public.extract_storage_path(OLD.logo_url, 'company-assets');
      IF v_path IS NOT NULL THEN
        BEGIN
          DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
          GET DIAGNOSTICS v_deleted = ROW_COUNT;
          IF v_deleted = 0 AND EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path) THEN
            PERFORM public.storage_cleanup_enqueue('company-assets', v_path, 'delete affected 0 rows but object still exists');
          END IF;
        EXCEPTION WHEN OTHERS THEN
          PERFORM public.storage_cleanup_enqueue('company-assets', v_path, SQLERRM);
        END;
      END IF;
    END IF;
    IF OLD.banner_url IS DISTINCT FROM NEW.banner_url AND OLD.banner_url IS NOT NULL THEN
      v_path := public.extract_storage_path(OLD.banner_url, 'company-assets');
      IF v_path IS NOT NULL THEN
        BEGIN
          DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
          GET DIAGNOSTICS v_deleted = ROW_COUNT;
          IF v_deleted = 0 AND EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path) THEN
            PERFORM public.storage_cleanup_enqueue('company-assets', v_path, 'delete affected 0 rows but object still exists');
          END IF;
        EXCEPTION WHEN OTHERS THEN
          PERFORM public.storage_cleanup_enqueue('company-assets', v_path, SQLERRM);
        END;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    FOR v_path IN
      SELECT p FROM (VALUES
        (public.extract_storage_path(OLD.logo_url, 'company-assets')),
        (public.extract_storage_path(OLD.banner_url, 'company-assets'))
      ) AS t(p) WHERE p IS NOT NULL
    LOOP
      BEGIN
        DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
        IF v_deleted = 0 AND EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_path) THEN
          PERFORM public.storage_cleanup_enqueue('company-assets', v_path, 'delete affected 0 rows but object still exists');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        PERFORM public.storage_cleanup_enqueue('company-assets', v_path, SQLERRM);
      END;
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Purge de órfãos reescrito para enfileirar falhas
CREATE OR REPLACE FUNCTION public.storage_purge_orphans(_bucket text DEFAULT 'product-images'::text, _limit integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
  v_row RECORD;
  v_del int;
BEGIN
  IF _bucket NOT IN ('product-images', 'company-assets') THEN
    RAISE EXCEPTION 'Bucket não suportado: %', _bucket USING ERRCODE = '22023';
  END IF;

  IF _bucket = 'product-images' THEN
    FOR v_row IN
      SELECT o.name
        FROM storage.objects o
       WHERE o.bucket_id = 'product-images'
         AND NOT EXISTS (
           SELECT 1 FROM public.product_images pi
            WHERE public.extract_storage_path(pi.url, 'product-images') = o.name
         )
       LIMIT _limit
    LOOP
      BEGIN
        DELETE FROM storage.objects WHERE bucket_id = 'product-images' AND name = v_row.name;
        GET DIAGNOSTICS v_del = ROW_COUNT;
        v_deleted := v_deleted + v_del;
      EXCEPTION WHEN OTHERS THEN
        PERFORM public.storage_cleanup_enqueue('product-images', v_row.name, SQLERRM);
      END;
    END LOOP;
  ELSE
    FOR v_row IN
      SELECT o.name
        FROM storage.objects o
       WHERE o.bucket_id = 'company-assets'
         AND NOT EXISTS (
           SELECT 1 FROM public.companies co
            WHERE public.extract_storage_path(co.logo_url, 'company-assets') = o.name
               OR public.extract_storage_path(co.banner_url, 'company-assets') = o.name
         )
       LIMIT _limit
    LOOP
      BEGIN
        DELETE FROM storage.objects WHERE bucket_id = 'company-assets' AND name = v_row.name;
        GET DIAGNOSTICS v_del = ROW_COUNT;
        v_deleted := v_deleted + v_del;
      EXCEPTION WHEN OTHERS THEN
        PERFORM public.storage_cleanup_enqueue('company-assets', v_row.name, SQLERRM);
      END;
    END LOOP;
  END IF;

  RETURN v_deleted;
END;
$$;

-- 5) Worker de retry
CREATE OR REPLACE FUNCTION public.storage_cleanup_worker(_limit integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_processed int := 0;
  v_del int;
  v_backoff_minutes int;
BEGIN
  FOR v_row IN
    SELECT id, bucket, path, attempts
      FROM public.storage_cleanup_queue
     WHERE next_attempt_at <= now()
       AND attempts < 10
     ORDER BY next_attempt_at ASC
     LIMIT GREATEST(LEAST(COALESCE(_limit, 100), 1000), 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      DELETE FROM storage.objects
       WHERE bucket_id = v_row.bucket AND name = v_row.path;
      GET DIAGNOSTICS v_del = ROW_COUNT;

      IF v_del > 0 OR NOT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = v_row.bucket AND name = v_row.path
      ) THEN
        DELETE FROM public.storage_cleanup_queue WHERE id = v_row.id;
      ELSE
        v_backoff_minutes := LEAST(power(2, v_row.attempts + 1)::int, 1440);
        UPDATE public.storage_cleanup_queue
           SET attempts = attempts + 1,
               last_error = 'delete no-op; object still present',
               next_attempt_at = now() + make_interval(mins => v_backoff_minutes)
         WHERE id = v_row.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_backoff_minutes := LEAST(power(2, v_row.attempts + 1)::int, 1440);
      UPDATE public.storage_cleanup_queue
         SET attempts = attempts + 1,
             last_error = SQLERRM,
             next_attempt_at = now() + make_interval(mins => v_backoff_minutes)
       WHERE id = v_row.id;
    END;
    v_processed := v_processed + 1;
  END LOOP;

  -- Descartar itens que excederam o limite de tentativas
  WITH dead AS (
    DELETE FROM public.storage_cleanup_queue
     WHERE attempts >= 10
     RETURNING bucket, path, attempts, last_error
  )
  INSERT INTO public.audit_log (actor_id, entity_type, entity_id, action, new_value, reason)
  SELECT NULL, 'storage', gen_random_uuid(), 'storage_cleanup_gave_up',
         jsonb_build_object('bucket', d.bucket, 'path', d.path, 'attempts', d.attempts),
         d.last_error
    FROM dead d;

  RETURN v_processed;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_cleanup_worker(integer) FROM PUBLIC;

-- 6) Agendar via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('storage-cleanup-worker')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'storage-cleanup-worker');
    PERFORM cron.schedule(
      'storage-cleanup-worker',
      '*/5 * * * *',
      $cron$ SELECT public.storage_cleanup_worker(100); $cron$
    );
  END IF;
END $$;
