-- QA Fix #1 (Crítico): endurecer INSERT em public.leads
-- Antes: policy sem WITH CHECK → qualquer company_id/product_id era aceito
-- Depois: só empresas aprovadas e produtos visíveis (ativos, não deletados, aprovados)

DROP POLICY IF EXISTS "Qualquer um envia lead para produto visível" ON public.leads;

CREATE POLICY "Qualquer um envia lead para produto visível"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Empresa alvo precisa estar aprovada
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = leads.company_id
      AND c.status = 'approved'
  )
  -- Se product_id for informado, precisa pertencer à mesma empresa e estar visível
  AND (
    leads.product_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = leads.product_id
        AND p.company_id = leads.company_id
        AND p.is_active = true
        AND p.deleted_at IS NULL
        AND p.moderation_status = 'approved'
    )
  )
);

-- Bônus: remover policy duplicada em user_roles (limpeza)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;