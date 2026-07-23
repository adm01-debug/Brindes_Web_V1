
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS seller_muted_until timestamptz;

-- Sincroniza booleans com expiração (para código existente que ainda lê buyer_muted/seller_muted)
CREATE OR REPLACE FUNCTION public.expire_conversation_mutes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversations
     SET buyer_muted = false, buyer_muted_until = NULL
   WHERE buyer_muted = true AND buyer_muted_until IS NOT NULL AND buyer_muted_until <= now();
  UPDATE public.conversations
     SET seller_muted = false, seller_muted_until = NULL
   WHERE seller_muted = true AND seller_muted_until IS NOT NULL AND seller_muted_until <= now();
$$;

-- Agenda expiração automática a cada minuto (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-conversation-mutes')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-conversation-mutes');
    PERFORM cron.schedule(
      'expire-conversation-mutes',
      '* * * * *',
      $cron$ SELECT public.expire_conversation_mutes(); $cron$
    );
  END IF;
END $$;
