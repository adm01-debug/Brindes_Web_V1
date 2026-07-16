
-- 1. Dedupe silencioso: se já houve view do mesmo ip_hash no mesmo produto na última hora, ignora.
CREATE OR REPLACE FUNCTION public.product_views_dedupe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ip_hash IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.product_views
    WHERE product_id = NEW.product_id
      AND ip_hash = NEW.ip_hash
      AND viewed_at > now() - interval '1 hour'
  ) THEN
    RETURN NULL; -- descarta silenciosamente
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.product_views_dedupe() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_product_views_dedupe ON public.product_views;
CREATE TRIGGER trg_product_views_dedupe
  BEFORE INSERT ON public.product_views
  FOR EACH ROW
  EXECUTE FUNCTION public.product_views_dedupe();

-- 2. Incremento do contador denormalizado
CREATE OR REPLACE FUNCTION public.product_views_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = NEW.product_id;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.product_views_increment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_product_views_increment ON public.product_views;
CREATE TRIGGER trg_product_views_increment
  AFTER INSERT ON public.product_views
  FOR EACH ROW
  EXECUTE FUNCTION public.product_views_increment();

-- 3. Índice de suporte ao check anti-flood
CREATE INDEX IF NOT EXISTS idx_product_views_flood
  ON public.product_views (product_id, ip_hash, viewed_at DESC);
