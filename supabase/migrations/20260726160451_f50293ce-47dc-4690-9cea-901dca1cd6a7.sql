-- Visitantes anônimos precisam ler o catálogo público de fornecedores.
-- A política RLS "Public can view approved companies" já limita as linhas a status='approved',
-- mas faltava o GRANT de SELECT para a role anon (PostgREST retornava 42501).
-- Concedemos privilégio POR COLUNA para manter CNPJ, e-mail, telefone, owner_id
-- e rejection_reason inacessíveis a visitantes não autenticados.
GRANT SELECT (
  id,
  name,
  slug,
  tagline,
  description,
  logo_url,
  banner_url,
  city,
  state,
  website,
  instagram,
  facebook,
  linkedin,
  whatsapp,
  plan,
  featured_until,
  status,
  created_at,
  updated_at
) ON public.companies TO anon;