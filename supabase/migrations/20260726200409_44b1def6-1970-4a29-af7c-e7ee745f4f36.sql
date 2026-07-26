-- 1) Funções internas: remover EXECUTE de roles expostas na API.
--    Gatilhos rodam como owner da tabela, então não precisam de GRANT algum.
REVOKE ALL ON FUNCTION public.company_reviews_sanitize() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kits_sanitize() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_facet_counts_dirty() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.product_price_tiers_validate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.products_guard_owner_insert() FROM PUBLIC, anon, authenticated;

-- Rotinas de manutenção de Storage: chamadas por pg_cron/service_role apenas.
REVOKE ALL ON FUNCTION public.storage_cleanup_enqueue(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.storage_cleanup_worker(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_cleanup_enqueue(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.storage_cleanup_worker(integer) TO service_role;

-- 2) Web Vitals: substituir WITH CHECK (true) por validação explícita.
--    As CHECK constraints já cobrem os domínios; a policy replica os limites
--    para que a intenção fique auditável e bloqueia backdating/pré-datação.
DROP POLICY IF EXISTS wv_events_insert_public ON public.web_vitals_events;
CREATE POLICY wv_events_insert_public
  ON public.web_vitals_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    metric IN ('LCP', 'INP', 'CLS', 'TTFB', 'FCP')
    AND value >= 0 AND value < 100000
    AND char_length(route) BETWEEN 1 AND 200
    AND (rating IS NULL OR rating IN ('good', 'needs-improvement', 'poor'))
    AND (nav_type IS NULL OR char_length(nav_type) <= 32)
    AND (ua_family IS NULL OR char_length(ua_family) <= 32)
    AND created_at > now() - interval '1 hour'
    AND created_at < now() + interval '5 minutes'
  );

-- 3) Tabela de estado interna: sem policies por design (acesso só via
--    funções SECURITY DEFINER e pg_cron). Documentado para auditorias.
COMMENT ON TABLE public.facet_counts_state IS
  'Uso interno: flag de invalidação do cache de contagens de facetas. RLS ativo sem policies de propósito — nenhum acesso direto pela API; leitura/escrita apenas por rotinas SECURITY DEFINER e pg_cron.';