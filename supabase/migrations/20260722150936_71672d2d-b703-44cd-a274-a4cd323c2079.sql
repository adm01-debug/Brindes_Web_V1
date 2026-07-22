CREATE OR REPLACE FUNCTION public.products_guard_owner_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Força moderação pendente para novos produtos criados por donos
  NEW.moderation_status := 'pending';
  NEW.moderation_reason := NULL;
  NEW.moderated_by := NULL;
  NEW.moderated_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_guard_owner_insert_trg ON public.products;
CREATE TRIGGER products_guard_owner_insert_trg
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_guard_owner_insert();