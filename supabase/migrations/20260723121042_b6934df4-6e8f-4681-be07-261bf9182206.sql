
DO $$ BEGIN
  CREATE TYPE public.company_plan AS ENUM ('free','pro','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan public.company_plan NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

-- Índice para ordenação de destaques ativos
CREATE INDEX IF NOT EXISTS idx_companies_featured_active
  ON public.companies (plan, featured_until DESC NULLS LAST, created_at DESC)
  WHERE status = 'approved';

-- Grant admins de painel podem alterar plan/featured_until (política de update já existe)
COMMENT ON COLUMN public.companies.plan IS 'Plano de visibilidade: free (padrão), pro (destaque), premium (topo)';
COMMENT ON COLUMN public.companies.featured_until IS 'Data limite do destaque; NULL = sem destaque temporal.';
