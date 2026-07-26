-- Etapa 5: auto-classificação de produtos em facetas.
ALTER TABLE public.facet_terms
  ADD COLUMN IF NOT EXISTS match_keywords text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.facet_terms.match_keywords IS
  'Termos usados pelo matcher suggest_product_facets para sugerir esta faceta a partir do texto do produto.';

-- Palavras-chave dos tipos de brinde (armazenadas já sem acento e em minúsculas).
UPDATE public.facet_terms t
   SET match_keywords = k.words
  FROM (VALUES
    ('canecas-personalizadas', ARRAY['caneca','canecas','mug','xicara','xicaras','caneco']),
    ('camisetas-personalizadas', ARRAY['camiseta','camisetas','camisa','polo','uniforme','regata','moletom']),
    ('canetas-personalizadas', ARRAY['caneta','canetas','lapiseira','esferografica','roller']),
    ('garrafas-e-squeezes', ARRAY['garrafa','garrafas','squeeze','squeezes','termica','copo termico','galheteiro','copo']),
    ('mochilas-e-bolsas', ARRAY['mochila','mochilas','bolsa','bolsas','sacola','ecobag','necessaire','pasta']),
    ('cadernos-e-agendas', ARRAY['caderno','cadernos','agenda','agendas','bloco','caderneta','planner','sketchbook']),
    ('chaveiros-personalizados', ARRAY['chaveiro','chaveiros','porta chaves']),
    ('eletronicos-e-powerbanks', ARRAY['powerbank','power bank','pen drive','pendrive','carregador','caixa de som','fone','mouse','eletronico']),
    ('kits-gourmet', ARRAY['kit gourmet','churrasco','vinho','cafe','whisky','tabua','gourmet','abridor']),
    ('guarda-chuvas', ARRAY['guarda chuva','guarda-chuva','sombrinha','sombrinhas']),
    ('bones-e-vestuario', ARRAY['bone','bones','viseira','jaqueta','colete','avental','chapeu']),
    ('brindes-ecologicos', ARRAY['ecologico','sustentavel','bambu','reciclado','biodegradavel','ecobag','pet reciclado'])
  ) AS k(slug, words)
 WHERE t.slug = k.slug;

-- Palavras-chave dos eixos evento e público, quando existirem os termos.
UPDATE public.facet_terms t
   SET match_keywords = k.words
  FROM (VALUES
    ('formatura', ARRAY['formatura','formando','graduacao','colacao']),
    ('casamento', ARRAY['casamento','noivos','padrinhos','lembrancinha de casamento']),
    ('confraternizacao', ARRAY['confraternizacao','fim de ano','natal','amigo secreto']),
    ('feiras-e-eventos', ARRAY['feira','stand','congresso','evento','expo'])
  ) AS k(slug, words)
 WHERE t.slug = k.slug
   AND t.match_keywords = ARRAY[]::text[];

/**
 * Sugere facetas para um texto livre (nome + descrição do produto).
 * SECURITY DEFINER apenas para ler facet_terms/facet_axes sem depender das
 * políticas do chamador; não expõe nenhum dado sensível — só o catálogo de
 * vitrines, que já é público. Retorna score decrescente.
 */
CREATE OR REPLACE FUNCTION public.suggest_product_facets(_text text, _limit integer DEFAULT 8)
RETURNS TABLE(term_id uuid, term_slug text, term_name text, axis_slug text, axis_name text, score real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH src AS (
    SELECT lower(public.unaccent_safe(NULLIF(btrim(coalesce(_text, '')), ''))) AS txt
  )
  SELECT
    t.id,
    t.slug,
    t.name,
    a.slug,
    a.name,
    GREATEST(
      -- Match exato por palavra-chave vale mais do que similaridade fuzzy.
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(t.match_keywords) w
         WHERE (SELECT txt FROM src) LIKE '%' || w || '%'
      ) THEN 1.0::real ELSE 0.0::real END,
      similarity(lower(public.unaccent_safe(t.name)), (SELECT txt FROM src))
    ) AS score
  FROM public.facet_terms t
  JOIN public.facet_axes a ON a.id = t.axis_id
  WHERE (SELECT txt FROM src) IS NOT NULL
    AND t.is_active = true
    AND a.is_active = true
  ORDER BY score DESC, t.sort_order ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 8), 1), 24);
$$;

-- Só o painel (usuário logado) precisa da sugestão; visitantes não.
REVOKE ALL ON FUNCTION public.suggest_product_facets(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_product_facets(text, integer) TO authenticated;