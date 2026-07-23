
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_muted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_archived ON public.conversations(buyer_id, buyer_archived_at);
CREATE INDEX IF NOT EXISTS idx_conversations_company_archived ON public.conversations(company_id, seller_archived_at);
