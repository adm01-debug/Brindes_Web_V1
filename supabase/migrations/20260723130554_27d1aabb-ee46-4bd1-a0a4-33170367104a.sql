ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'quote'
    CHECK (kind IN ('quote','sample')),
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_company_kind_created
  ON public.leads(company_id, kind, created_at DESC);