
-- ============================================================
-- Fase 1.1 — Hardening RLS + índices críticos
-- ============================================================

-- (1) FIX CRÍTICO: dono da empresa não pode alterar o próprio status.
-- A policy antiga usava `WHERE companies_1.id = companies_1.id` (autorreferência),
-- que sempre retorna o próprio status permitindo bypass. Substituímos por
-- comparação real com o valor persistido, e blindamos com trigger.
DROP POLICY IF EXISTS "Owners can update their own company" ON public.companies;

CREATE POLICY "Owners can update their own company"
ON public.companies
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Trigger para impedir que o dono altere colunas restritas (status, rejection_reason, owner_id, slug).
-- Admins passam sem restrição (has_role).
CREATE OR REPLACE FUNCTION public.companies_guard_owner_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Alteração de status não permitida';
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Alteração de rejection_reason não permitida';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Alteração de owner_id não permitida';
  END IF;
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Alteração de slug não permitida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_guard_owner_update ON public.companies;
CREATE TRIGGER companies_guard_owner_update
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.companies_guard_owner_update();

-- (2) Guarda equivalente em products: dono não pode alterar moderation_status/moderated_by/moderated_at/moderation_reason.
CREATE OR REPLACE FUNCTION public.products_guard_owner_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    RAISE EXCEPTION 'Alteração de moderation_status não permitida';
  END IF;
  IF NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason THEN
    RAISE EXCEPTION 'Alteração de moderation_reason não permitida';
  END IF;
  IF NEW.moderated_by IS DISTINCT FROM OLD.moderated_by THEN
    RAISE EXCEPTION 'Alteração de moderated_by não permitida';
  END IF;
  IF NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN
    RAISE EXCEPTION 'Alteração de moderated_at não permitida';
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Alteração de company_id não permitida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_guard_owner_update ON public.products;
CREATE TRIGGER products_guard_owner_update
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_guard_owner_update();

-- (3) Blindar user_roles: nenhum caminho de escrita para usuários comuns.
-- Apenas admins podem manipular; SECURITY DEFINER (handle_new_user) segue funcionando.
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- (4) Índices faltantes para os hot paths de leitura pública.
CREATE INDEX IF NOT EXISTS idx_products_visible
  ON public.products (company_id, is_active, moderation_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_visible
  ON public.products (category_id)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort
  ON public.product_images (product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_views_product_date
  ON public.product_views (product_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_companies_status_slug
  ON public.companies (status, slug);
