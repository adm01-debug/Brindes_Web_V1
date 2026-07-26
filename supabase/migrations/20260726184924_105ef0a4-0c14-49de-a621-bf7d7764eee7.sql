-- Etapa 4: eixo "Tipo de brinde" para páginas long-tail de SEO
-- (ex.: "canecas personalizadas", "camisetas personalizadas").
INSERT INTO public.facet_axes (slug, name, hub_path, seo_title, seo_description, sort_order, is_active)
VALUES (
  'tipo',
  'Tipo de brinde',
  '/tipos-de-brinde',
  'Tipos de Brindes Personalizados — Canecas, Camisetas, Canetas | BrindesHub',
  'Navegue por tipo de brinde personalizado: canecas, camisetas, canetas, garrafas, mochilas, cadernos e muito mais, com fornecedores de todo o Brasil.',
  40,
  true
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      hub_path = EXCLUDED.hub_path,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      is_active = true;

-- Termos iniciais. `sort_order` reflete a demanda estimada do mercado de brindes.
INSERT INTO public.facet_terms (axis_id, slug, name, description, seo_title, seo_description, sort_order, is_active)
SELECT
  a.id, t.slug, t.name, t.description, t.seo_title, t.seo_description, t.sort_order, true
FROM public.facet_axes a
CROSS JOIN (VALUES
  ('canecas-personalizadas','Canecas personalizadas','Canecas de cerâmica, porcelana, inox e térmicas com impressão da sua marca.','Canecas Personalizadas com Logo — Orçamento Grátis | BrindesHub','Compare fornecedores de canecas personalizadas: cerâmica, porcelana, inox e térmicas. Peça orçamento para vários fabricantes de uma só vez.',10),
  ('camisetas-personalizadas','Camisetas personalizadas','Camisetas, polos e uniformes com silk, bordado ou sublimação.','Camisetas Personalizadas para Empresas e Eventos | BrindesHub','Camisetas, polos e uniformes personalizados com silk, bordado ou sublimação. Compare fornecedores e solicite orçamentos em minutos.',20),
  ('canetas-personalizadas','Canetas personalizadas','Canetas plásticas, metálicas e ecológicas com gravação a laser ou tampografia.','Canetas Personalizadas com Logo — Fornecedores | BrindesHub','Canetas plásticas, metálicas e ecológicas personalizadas. Veja fornecedores, faixas de preço por quantidade e peça orçamento.',30),
  ('garrafas-e-squeezes','Garrafas e squeezes','Garrafas térmicas, squeezes e copos reutilizáveis personalizados.','Garrafas e Squeezes Personalizados | BrindesHub','Garrafas térmicas, squeezes e copos reutilizáveis com sua marca. Compare fornecedores e prazos de produção.',40),
  ('mochilas-e-bolsas','Mochilas e bolsas','Mochilas, sacolas, ecobags e necessaires personalizadas.','Mochilas e Bolsas Personalizadas para Brinde | BrindesHub','Mochilas, sacolas, ecobags e necessaires personalizadas para eventos e campanhas corporativas.',50),
  ('cadernos-e-agendas','Cadernos e agendas','Cadernos, blocos e agendas personalizadas para o dia a dia corporativo.','Cadernos e Agendas Personalizadas | BrindesHub','Cadernos, blocos e agendas com capa personalizada. Ideal para kits de boas-vindas e eventos corporativos.',60),
  ('chaveiros-personalizados','Chaveiros personalizados','Chaveiros em metal, acrílico, couro e emborrachados.','Chaveiros Personalizados com Logo | BrindesHub','Chaveiros em metal, acrílico, couro e PVC personalizados. Baixo custo por unidade e alto volume de distribuição.',70),
  ('eletronicos-e-powerbanks','Eletrônicos e powerbanks','Powerbanks, pen drives, caixas de som e carregadores personalizados.','Powerbanks e Eletrônicos Personalizados | BrindesHub','Powerbanks, pen drives, caixas de som e carregadores com sua marca. Brindes de alto valor percebido.',80),
  ('kits-gourmet','Kits gourmet','Kits de churrasco, vinho, café e utensílios personalizados.','Kits Gourmet Personalizados para Presente Corporativo | BrindesHub','Kits de churrasco, vinho, café e utensílios personalizados para presentear clientes e colaboradores.',90),
  ('guarda-chuvas','Guarda-chuvas','Guarda-chuvas e sombrinhas personalizados com a sua marca.','Guarda-chuvas Personalizados com Logo | BrindesHub','Guarda-chuvas e sombrinhas personalizados: modelos portáteis, automáticos e para portaria.',100),
  ('bones-e-vestuario','Bonés e vestuário','Bonés, viseiras, jaquetas e acessórios personalizados.','Bonés e Vestuário Personalizado para Empresas | BrindesHub','Bonés, viseiras, jaquetas e acessórios personalizados com bordado ou estampa da sua marca.',110),
  ('brindes-ecologicos','Brindes ecológicos','Produtos sustentáveis em bambu, material reciclado e biodegradável.','Brindes Ecológicos e Sustentáveis Personalizados | BrindesHub','Brindes sustentáveis em bambu, PET reciclado e materiais biodegradáveis para campanhas ESG.',120)
) AS t(slug, name, description, seo_title, seo_description, sort_order)
WHERE a.slug = 'tipo'
ON CONFLICT (axis_id, slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      sort_order = EXCLUDED.sort_order,
      is_active = true;