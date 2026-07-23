
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('lead','question','answer','review','system')),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: new lead -> notify company owner
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_owner UUID;
  v_company TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner, v_company
  FROM public.companies WHERE id = NEW.company_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, url, metadata)
    VALUES (
      v_owner,
      CASE WHEN NEW.kind = 'sample' THEN 'lead' ELSE 'lead' END,
      CASE WHEN NEW.kind = 'sample' THEN 'Nova solicitação de amostra' ELSE 'Novo pedido de orçamento' END,
      COALESCE(NEW.name, 'Cliente') || ' — ' || COALESCE(v_company, ''),
      '/painel/leads',
      jsonb_build_object('lead_id', NEW.id, 'kind', NEW.kind)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- Trigger: new question -> notify product/company owner
CREATE OR REPLACE FUNCTION public.notify_new_question()
RETURNS TRIGGER AS $$
DECLARE
  v_owner UUID;
  v_product_name TEXT;
BEGIN
  SELECT c.owner_id, p.name INTO v_owner, v_product_name
  FROM public.products p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.id = NEW.product_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, url, metadata)
    VALUES (
      v_owner,
      'question',
      'Nova pergunta em produto',
      COALESCE(v_product_name, 'Produto') || ': ' || left(NEW.question, 120),
      '/painel/perguntas',
      jsonb_build_object('question_id', NEW.id, 'product_id', NEW.product_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_new_question ON public.product_questions;
CREATE TRIGGER trg_notify_new_question
  AFTER INSERT ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_question();

-- Trigger: question answered -> notify asker
CREATE OR REPLACE FUNCTION public.notify_question_answered()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  IF NEW.status = 'answered' AND (OLD.status IS DISTINCT FROM 'answered') AND NEW.asker_user_id IS NOT NULL THEN
    SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    INSERT INTO public.notifications(user_id, kind, title, body, url, metadata)
    VALUES (
      NEW.asker_user_id,
      'answer',
      'Sua pergunta foi respondida',
      COALESCE(v_product_name, 'Produto') || ': ' || left(COALESCE(NEW.answer,''), 120),
      '/produto/' || NEW.product_id::text,
      jsonb_build_object('question_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_question_answered ON public.product_questions;
CREATE TRIGGER trg_notify_question_answered
  AFTER UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_question_answered();

-- Trigger: new review -> notify company owner
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_owner UUID;
  v_company TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner, v_company FROM public.companies WHERE id = NEW.company_id;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, url, metadata)
    VALUES (
      v_owner,
      'review',
      'Nova avaliação recebida',
      COALESCE(v_company, 'Sua empresa') || ' — ' || NEW.rating::text || '★',
      '/empresa/' || NEW.company_id::text,
      jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_new_review ON public.company_reviews;
CREATE TRIGGER trg_notify_new_review
  AFTER INSERT ON public.company_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();
