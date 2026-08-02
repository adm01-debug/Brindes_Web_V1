import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const SearchSchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type SemanticSearchResult = {
  id: string;
  name: string;
  slug: string | null;
  shortDescription: string | null;
  image: string | null;
  price: number | null;
  priceOnRequest: boolean;
  companySlug: string;
  companyName: string;
};

/**
 * Busca semântica de produtos.
 *
 * Delega para a RPC `search_products` — a mesma fonte de verdade usada pela
 * página /buscar. Isso garante três invariantes que uma query montada à mão
 * não garantia antes: (1) apenas produtos ativos, aprovados e de empresas
 * aprovadas são retornados; (2) o ranqueamento usa o `search_vector`
 * (tsvector) já indexado, em vez de `textSearch` sobre uma única coluna, que
 * falhava em consultas com mais de uma palavra; (3) a imagem primária vem no
 * mesmo round-trip, eliminando a query N+1 que existia aqui.
 */
export const semanticSearchProducts = createServerFn({ method: "GET" })
  .inputValidator((data) => SearchSchema.parse(data))
  .handler(async ({ data }): Promise<SemanticSearchResult[]> => {
    const { data: rows, error } = await supabase.rpc("search_products", {
      _q: data.query,
      _sort: "relevancia",
      _page: 1,
      _page_size: data.limit,
    });

    if (error) {
      console.error("[SemanticSearch] Falha na RPC search_products:", error.message);
      throw new Error("Falha na busca semântica");
    }

    return (rows ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug ?? null,
      shortDescription: item.short_description ?? null,
      image: item.primary_image_url ?? null,
      price: item.promo_price ?? item.price ?? null,
      priceOnRequest: Boolean(item.price_on_request),
      companySlug: item.company_slug,
      companyName: item.company_name,
    }));
  });
