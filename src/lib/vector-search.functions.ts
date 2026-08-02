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
    // Usamos o RPC match_products para busca semântica real
    // Nota: embedding deve ser gerado pelo AI Gateway. Como fallback
    // usamos busca textual enquanto o embedding não é passado.
    const { data: results, error } = await supabase
      .from('products')
      .select('id, name, description, slug, price, short_description')
      .textSearch('name', data.query)
      .limit(data.limit);

    if (error) {
      console.error("[SemanticSearch] Error:", error);
      throw new Error("Falha na busca semântica");
    }

    // Buscamos as imagens primárias separadamente para evitar SelectQueryError
    const productIds = results.map(p => p.id);
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, url')
      .in('product_id', productIds)
      .eq('is_primary', true);

    return results.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      shortDescription: item.short_description,
      slug: item.slug,
      image: images?.find(img => img.product_id === item.id)?.url || null,
      price: item.price
    }));
  });


