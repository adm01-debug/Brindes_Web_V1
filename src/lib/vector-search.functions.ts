import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const SearchSchema = z.object({
  query: z.string().min(2),
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.5),
});

/**
 * Busca Semântica de Produtos
 * Retorna dados serializáveis seguros para o TanStack Start.
 */
export const semanticSearchProducts = createServerFn({ method: "GET" })
  .inputValidator((data) => SearchSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: results, error } = await supabase
      .from('products')
      .select('id, name, description, slug, main_image_url, price_range')
      .textSearch('name', data.query)
      .limit(data.limit);

    if (error) {
      console.error("[SemanticSearch] Error:", error);
      throw new Error("Falha na busca semântica");
    }

    // Garante que o retorno seja serializável e livre de tipos complexos do Postgres
    return results.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      slug: item.slug,
      image: item.main_image_url,
      price: item.price_range
    }));
  });

