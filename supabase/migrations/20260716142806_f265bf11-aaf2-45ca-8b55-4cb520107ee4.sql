
-- 1) Auto-referência
ALTER TABLE public.categories
  ADD CONSTRAINT categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id) NOT VALID;

ALTER TABLE public.categories VALIDATE CONSTRAINT categories_no_self_parent;

-- 2) Ciclo e profundidade máxima
CREATE OR REPLACE FUNCTION public.categories_prevent_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current UUID := NEW.parent_id;
  v_depth INTEGER := 0;
  v_max_depth CONSTANT INTEGER := 5;
BEGIN
  WHILE v_current IS NOT NULL LOOP
    v_depth := v_depth + 1;
    IF v_current = NEW.id THEN
      RAISE EXCEPTION 'Ciclo detectado na árvore de categorias' USING ERRCODE = '23514';
    END IF;
    IF v_depth > v_max_depth THEN
      RAISE EXCEPTION 'Profundidade máxima de categorias (%) excedida', v_max_depth USING ERRCODE = '23514';
    END IF;
    SELECT parent_id INTO v_current FROM public.categories WHERE id = v_current;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.categories_prevent_cycle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS categories_prevent_cycle_trg ON public.categories;
CREATE TRIGGER categories_prevent_cycle_trg
  BEFORE INSERT OR UPDATE OF parent_id ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_prevent_cycle();
