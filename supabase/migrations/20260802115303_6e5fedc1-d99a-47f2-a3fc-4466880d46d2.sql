-- ============================================================
-- Etapa 44 — Correção de falhas críticas detectadas na auditoria
-- ============================================================

-- ------------------------------------------------------------
-- FALHA 1 (CRÍTICA, ativa): metrics_daily_snapshot tinha DUAS
-- assinaturas — () e (_day date DEFAULT NULL). O pg_cron chama
-- `SELECT public.metrics_daily_snapshot();`, que o Postgres não
-- consegue resolver:
--   ERROR: function public.metrics_daily_snapshot() is not unique (42725)
-- Resultado: o snapshot diário falha desde 2026-07-16. O painel
-- admin ficou 17 dias sem dados novos.
--
-- Correção: remover a variante sem argumentos. A variante com
-- `_day` é estritamente superior — cobre o caso corrente via
-- DEFAULT e ainda permite backfill histórico.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.metrics_daily_snapshot();

COMMENT ON FUNCTION public.metrics_daily_snapshot(date) IS
  'Snapshot diário de métricas. Assinatura ÚNICA de propósito: NÃO criar overload sem argumentos — o pg_cron chama sem parâmetros e um overload torna a chamada ambígua (SQLSTATE 42725).';

-- Backfill de todos os dias perdidos, do último dia gravado até hoje.
DO $$
DECLARE
  v_day date;
  v_from date;
BEGIN
  SELECT COALESCE(max(day), (now() AT TIME ZONE 'UTC')::date - 30)
    INTO v_from FROM public.metrics_daily;

  FOR v_day IN
    SELECT d::date
      FROM generate_series(v_from, (now() AT TIME ZONE 'UTC')::date, interval '1 day') d
  LOOP
    PERFORM public.metrics_daily_snapshot(v_day);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- FALHA 2 (CRÍTICA, latente): on_message_insert gravava em
-- notifications(..., meta), mas a coluna real chama-se `metadata`.
-- Como ainda não existe nenhuma conversa, o erro nunca disparou —
-- mas a PRIMEIRA mensagem enviada no chat abortaria a transação
-- inteira com `column "meta" of relation "notifications" does not
-- exist`, derrubando o envio.
--
-- Correção: usar `metadata` e preencher `url`, alinhando o
-- contrato com os demais gatilhos de notificação (lead, review,
-- question), que a UI já consome.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_message_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Nunca deixar a notificação derrubar o envio da mensagem.
    BEGIN
      INSERT INTO public.notifications (user_id, kind, title, body, url, metadata)
      VALUES (
        v_recipient,
        'message',
        'Nova mensagem',
        left(NEW.body, 140),
        '/painel/mensagens/' || NEW.conversation_id::text,
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'company', v_company_name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;