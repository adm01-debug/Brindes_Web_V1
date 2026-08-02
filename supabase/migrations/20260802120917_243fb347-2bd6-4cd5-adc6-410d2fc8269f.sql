-- 1. Habilitar extensões necessárias
create extension if not exists vector;

-- 2. Tabela de embeddings de produtos
create table if not exists public.product_embeddings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  embedding vector(1536), -- Compatível com text-embedding-3-small
  content text not null, -- Texto concatenado usado para gerar o embedding
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Grants
grant select on public.product_embeddings to anon, authenticated;
grant all on public.product_embeddings to service_role;

-- 4. RLS
alter table public.product_embeddings enable row level security;

create policy "Embeddings são legíveis por todos"
on public.product_embeddings
for select
to anon, authenticated
using (true);

-- 5. Índice de performance para busca vetorial
create index on public.product_embeddings using hnsw (embedding vector_cosine_ops);

-- 6. Função RPC para busca semântica
create or replace function public.match_products (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  product_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
stable
set search_path = public
as $$
begin
  return query
  select
    pe.id,
    pe.product_id,
    pe.content,
    pe.metadata,
    1 - (pe.embedding <=> query_embedding) as similarity
  from public.product_embeddings pe
  where 1 - (pe.embedding <=> query_embedding) > match_threshold
  order by pe.embedding <=> query_embedding
  limit match_count;
end;
$$;