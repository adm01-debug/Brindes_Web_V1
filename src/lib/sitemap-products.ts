/**
 * Geração fragmentada do sitemap de produtos.
 *
 * O catálogo é a única seção com potencial de estourar o teto de 50.000 URLs
 * por arquivo. Em vez de truncar silenciosamente (perdendo cauda longa), o
 * conjunto é fatiado em páginas determinísticas e o índice publica uma entrada
 * por fatia.
 *
 * Ordenação: `created_at` ascendente + `id` como desempate. Isso mantém cada
 * fatia estável ao longo do tempo — produtos novos entram sempre na última
 * página, em vez de deslocar todo o particionamento (o que aconteceria com
 * ordenação por `updated_at`, invalidando o ETag de todas as fatias a cada
 * edição).
 *
 * Módulo server-only: importado apenas pelas rotas de sitemap.
 */
import { SITE_URL, escapeXml, sitemapSupabase, urlEntry, urlset } from "@/lib/sitemap-xml";

/** URLs por fatia. Bem abaixo do teto de 50k para folga de tamanho em bytes. */
export const PRODUCTS_CHUNK_SIZE = 5000;
/** Teto defensivo de fatias (250k produtos). Evita índice infinito. */
export const MAX_PRODUCT_CHUNKS = 50;

type ProductImage = { url: string; is_primary: boolean; sort_order: number };

/** Quantidade de fatias necessárias (mínimo 1, para o sitemap nunca sumir). */
export async function countProductChunks(): Promise<number> {
  const supabase = sitemapSupabase();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("moderation_status", "approved");

  if (error || !count) return 1;
  return Math.min(Math.max(1, Math.ceil(count / PRODUCTS_CHUNK_SIZE)), MAX_PRODUCT_CHUNKS);
}

/**
 * XML de uma fatia (1-indexada). Página fora do intervalo devolve um urlset
 * vazio e válido — melhor que 404 para um crawler que guardou uma URL antiga.
 */
export async function buildProductsSitemap(page: number): Promise<string> {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  if (safePage > MAX_PRODUCT_CHUNKS) return urlset([], true);

  const from = (safePage - 1) * PRODUCTS_CHUNK_SIZE;
  const to = from + PRODUCTS_CHUNK_SIZE - 1;

  const supabase = sitemapSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id, updated_at, name, product_images(url, is_primary, sort_order)")
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  // PGRST103 = range além do fim do conjunto: fatia vazia, não é erro fatal.
  if (error && error.code !== "PGRST103") throw error;

  const entries = (data ?? []).map((p) => {
    const images = ((p.product_images ?? []) as ProductImage[])
      .slice()
      .sort(
        (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
      )
      .slice(0, 5);

    const imageXml = images
      .map(
        (img) =>
          `    <image:image><image:loc>${escapeXml(img.url)}</image:loc>${
            p.name ? `<image:title>${escapeXml(p.name)}</image:title>` : ""
          }</image:image>`,
      )
      .join("\n");

    return urlEntry(
      `${SITE_URL}/produto/${p.id}`,
      p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
      "weekly",
      "0.6",
      imageXml || undefined,
    );
  });

  return urlset(entries, true);
}
