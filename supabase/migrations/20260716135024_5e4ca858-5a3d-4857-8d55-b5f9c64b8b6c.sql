
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON public.audit_log (actor_id);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger companies: registra mudança de status
CREATE OR REPLACE FUNCTION public.audit_companies_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_log (actor_id, entity_type, entity_id, action, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'company',
      NEW.id,
      'status_change:' || NEW.status,
      jsonb_build_object('status', OLD.status, 'rejection_reason', OLD.rejection_reason),
      jsonb_build_object('status', NEW.status, 'rejection_reason', NEW.rejection_reason, 'name', NEW.name, 'slug', NEW.slug),
      NEW.rejection_reason
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_companies_status ON public.companies;
CREATE TRIGGER trg_audit_companies_status
  AFTER UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_companies_status();

-- Trigger products: registra mudança de moderation_status
CREATE OR REPLACE FUNCTION public.audit_products_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    INSERT INTO public.audit_log (actor_id, entity_type, entity_id, action, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'product',
      NEW.id,
      'moderation:' || NEW.moderation_status,
      jsonb_build_object('moderation_status', OLD.moderation_status, 'moderation_reason', OLD.moderation_reason),
      jsonb_build_object('moderation_status', NEW.moderation_status, 'moderation_reason', NEW.moderation_reason, 'name', NEW.name, 'slug', NEW.slug),
      NEW.moderation_reason
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_products_moderation ON public.products;
CREATE TRIGGER trg_audit_products_moderation
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_products_moderation();
