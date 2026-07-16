
-- 1) No máximo 1 primária por produto
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_one_primary
  ON public.product_images (product_id)
  WHERE is_primary = true;

-- 2) Ao deletar a primária, promove a próxima
CREATE OR REPLACE FUNCTION public.product_images_ensure_primary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_primary = true THEN
    UPDATE public.product_images
       SET is_primary = true
     WHERE id = (
       SELECT id FROM public.product_images
        WHERE product_id = OLD.product_id AND id <> OLD.id
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 1
     );
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.product_images_ensure_primary() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS product_images_ensure_primary_trg ON public.product_images;
CREATE TRIGGER product_images_ensure_primary_trg
  AFTER DELETE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.product_images_ensure_primary();

-- 3) Primeira imagem de um produto vira primária automaticamente
CREATE OR REPLACE FUNCTION public.product_images_first_becomes_primary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = false OR NEW.is_primary IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.product_images
       WHERE product_id = NEW.product_id AND is_primary = true
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.product_images_first_becomes_primary() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS product_images_first_primary_trg ON public.product_images;
CREATE TRIGGER product_images_first_primary_trg
  BEFORE INSERT ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.product_images_first_becomes_primary();
