
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, company_id, product_id)
);
CREATE INDEX idx_conversations_buyer ON public.conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_company ON public.conversations(company_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

CREATE POLICY "participants read conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "buyer creates conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.status = 'approved')
  );

CREATE POLICY "participants update conversation" ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  );

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations cv
    LEFT JOIN public.companies c ON c.id = cv.company_id
    WHERE cv.id = _conv
      AND (cv.buyer_id = _user OR c.owner_id = _user)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

CREATE POLICY "participants read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "participants send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "recipient marks read" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer UUID;
  v_owner UUID;
  v_recipient UUID;
  v_company_name TEXT;
BEGIN
  UPDATE public.conversations
     SET last_message_at = NEW.created_at,
         last_message_preview = left(NEW.body, 140)
   WHERE id = NEW.conversation_id;

  SELECT cv.buyer_id, c.owner_id, c.name
    INTO v_buyer, v_owner, v_company_name
    FROM public.conversations cv
    JOIN public.companies c ON c.id = cv.company_id
   WHERE cv.id = NEW.conversation_id;

  v_recipient := CASE WHEN NEW.sender_id = v_buyer THEN v_owner ELSE v_buyer END;

  IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, kind, title, body, meta)
    VALUES (
      v_recipient,
      'message',
      'Nova mensagem',
      left(NEW.body, 140),
      jsonb_build_object('conversation_id', NEW.conversation_id, 'company', v_company_name, 'url', '/painel/mensagens/' || NEW.conversation_id)
    );
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

CREATE OR REPLACE FUNCTION public.start_conversation(
  _company_id UUID,
  _product_id UUID,
  _subject TEXT,
  _body TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_conv UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _body IS NULL OR length(btrim(_body)) < 1 THEN RAISE EXCEPTION 'empty_message'; END IF;

  INSERT INTO public.conversations (buyer_id, company_id, product_id, subject)
  VALUES (v_user, _company_id, _product_id, NULLIF(btrim(_subject), ''))
  ON CONFLICT (buyer_id, company_id, product_id)
  DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conv;

  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (v_conv, v_user, btrim(_body));

  RETURN v_conv;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_conversation(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_conversation(UUID, UUID, TEXT, TEXT) TO authenticated;
