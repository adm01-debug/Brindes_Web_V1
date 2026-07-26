import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FacetTerm } from "@/lib/facets";

export type FacetAxis = {
  id: string;
  slug: string;
  name: string;
  seo_title: string | null;
  seo_description: string | null;
};

export type FacetListedProduct = {
  id: string;
  name: string;
  price: number | null;
  price_on_request: boolean;
  short_description: string | null;
  promo_price: number | null;
  is_clearance: boolean | null;
  is_unusual: boolean | null;
  video_url: string | null;
  min_order_quantity: number | null;
  price_tiers: { min_qty: number; max_qty: number | null; unit_price: number }[] | null;
  company: { id: string; slug: string; name: string; plan?: string | null; featured_until?: string | null } | null;
  images: { url: string; sort_order: number }[] | null;
};

/** Eixo + todos os seus termos ativos — alimenta as páginas de hub. */
export const facetAxisQO = (axisSlug: string) =>
  queryOptions({
    queryKey: ["facet-axis", axisSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ axis: FacetAxis; terms: FacetTerm[] } | null> => {
      const { data: axis, error: axisError } = await supabase
        .from("facet_axes")
        .select("id, slug, name, seo_title, seo_description")
        .eq("slug", axisSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (axisError) throw axisError;
      if (!axis) return null;

      const { data: terms, error: termsError } = await supabase
        .from("facet_terms")
        .select("id, slug, name, icon, cover_url, description, seo_title, seo_description")
        .eq("axis_id", axis.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (termsError) throw termsError;

      return { axis: axis as FacetAxis, terms: (terms ?? []) as FacetTerm[] };
    },
  });

/** Um termo específico dentro de um eixo — alimenta a rota de listagem. */
export const facetTermQO = (axisSlug: string, termSlug: string) =>
  queryOptions({
    queryKey: ["facet-term", axisSlug, termSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ axis: FacetAxis; term: FacetTerm } | null> => {
      const { data: axis, error: axisError } = await supabase
        .from("facet_axes")
        .select("id, slug, name, seo_title, seo_description")
        .eq("slug", axisSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (axisError) throw axisError;
      if (!axis) return null;

      const { data: term, error: termError } = await supabase
        .from("facet_terms")
        .select("id, slug, name, icon, cover_url, description, seo_title, seo_description")
        .eq("axis_id", axis.id)
        .eq("slug", termSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (termError) throw termError;
      if (!term) return null;

      return { axis: axis as FacetAxis, term: term as FacetTerm };
    },
  });

/**
 * Produtos ligados a um termo. A política RLS de `product_facets` já esconde
 * ligações de produtos não publicados, mas os filtros são repetidos aqui para
 * que a query também funcione quando o leitor for o dono da empresa.
 */
export const facetProductsQO = (termId: string) =>
  queryOptions({
    queryKey: ["facet-products", termId],
    queryFn: async (): Promise<FacetListedProduct[]> => {
      const { data, error } = await supabase
        .from("product_facets")
        .select(
          `product:products!inner(
            id, name, price, price_on_request, short_description,
            promo_price, is_clearance, is_unusual, video_url, min_order_quantity,
            is_active, deleted_at, moderation_status,
            price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
            company:companies!inner(id, slug, name, status, plan, featured_until),
            images:product_images(url, sort_order)
          )`,
        )
        .eq("term_id", termId)
        .limit(48);
      if (error) throw error;

      return (data ?? [])
        .map((row) => (row as { product: unknown }).product as (FacetListedProduct & {
          is_active: boolean;
          deleted_at: string | null;
          moderation_status: string;
          company: (FacetListedProduct["company"] & { status: string }) | null;
        }) | null)
        .filter(
          (p): p is NonNullable<typeof p> =>
            !!p &&
            p.is_active &&
            !p.deleted_at &&
            p.moderation_status === "approved" &&
            p.company?.status === "approved",
        ) as FacetListedProduct[];
    },
  });
