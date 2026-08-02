-- Etapa 43: defense-in-depth hardening
-- 1) facet_counts_state: RLS estava ligada sem nenhuma policy (deny-all implícito).
--    Mantemos o deny-all para escrita e liberamos leitura apenas para admin,
--    dando observabilidade do flag `dirty` no painel sem abrir a tabela.
GRANT SELECT ON public.facet_counts_state TO authenticated;

DROP POLICY IF EXISTS "facet_counts_state_admin_read" ON public.facet_counts_state;
CREATE POLICY "facet_counts_state_admin_read"
  ON public.facet_counts_state
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON POLICY "facet_counts_state_admin_read" ON public.facet_counts_state IS
  'Somente admin lê. Escrita continua exclusiva de service_role / rotinas SECURITY DEFINER (nenhuma policy de INSERT/UPDATE/DELETE existe).';

-- 2) is_conversation_participant é helper exclusivo das policies de chat.
--    Nenhum código cliente chama via RPC: remover EXECUTE elimina a superfície
--    de enumeração de conversas. As policies rodam como owner e seguem funcionando.
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, authenticated, PUBLIC;