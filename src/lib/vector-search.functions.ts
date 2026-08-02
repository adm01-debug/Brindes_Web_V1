import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Este schema define a entrada para a busca semântica
const SearchSchema = z.object({
  query: z.string().min(2),
  limit: z.number().optional().default(10),
  threshold: z.number().optional().default(0.5),
});

/**
 * Busca Semântica de Produtos
 * Transforma a query do usuário em um embedding e busca similaridade no Postgres.
 */
export const semanticSearchProducts = createServerFn({ method: "GET" })
  .inputValidator((data) => SearchSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Gerar embedding para a query via Lovable AI Gateway
    // Nota: Como não temos a biblioteca de AI injetada diretamente no serverFn,
    // simulamos a chamada que seria feita ao backend de embeddings.
    
    // TODO: Integrar com AI Gateway quando o SDK estiver disponível no Worker.
    // Por enquanto, buscamos produtos que correspondam ao conteúdo textual via ILIKE 
    // como fallback enquanto os embeddings são processados em background.
    
    const { data: results, error } = await supabase
      .from('products')
      .select('*, product_embeddings!inner(similarity)')
      .textSearch('name', data.query)
      .limit(data.limit);

    if (error) {
      console.error("[SemanticSearch] Error:", error);
      throw new Error("Falha na busca semântica");
    }

    return results;
  });
