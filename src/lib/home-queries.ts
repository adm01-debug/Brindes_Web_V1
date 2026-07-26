import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyPlan } from "@/components/plan-badge";

/**
 * Consultas da home isoladas em queryOptions para que o loader da rota possa
 * pré-carregá-las no servidor (SSR) e o componente consumi-las com
 * useSuspenseQuery — eliminando skeletons no primeiro paint e tornando o
 * conteúdo indexável por crawlers que não executam JS.
 */

export type HomeCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

export type HomeCompany = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  banner_url: string | null;
  plan: CompanyPlan | null;
  featured_until: string | null;
};

const COMPANY_FIELDS =
  "id, slug, name, tagline, city, state, logo_url, banner_url, plan, featured_until";

const PRODUCT_FIELDS = `
  id, name, price, price_on_request, short_description,
  promo_price, is_clearance, is_unusual, video_url,
  price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
  company:companies!inner(id, slug, name, status, plan, featured_until),
  images:product_images(url, sort_order)
`;

export const homeCategoriesQO = () =>
  queryOptions({
    queryKey: ["categories"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<HomeCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, icon")
        .is("parent_id", null)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as HomeCategory[];
    },
  });

export const homeFeaturedCompaniesQO = () =>
  queryOptions({
    queryKey: ["featured-companies"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HomeCompany[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("companies")
        .select(COMPANY_FIELDS)
        .eq("status", "approved")
        .or(`plan.eq.premium,plan.eq.pro,featured_until.gt.${nowIso}`)
        .order("plan", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      if (data && data.length > 0) return data as HomeCompany[];

      // Fallback: nenhum destaque cadastrado — mostra as empresas mais recentes.
      const { data: recent, error: recentError } = await supabase
        .from("companies")
        .select(COMPANY_FIELDS)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (recentError) throw recentError;
      return (recent ?? []) as HomeCompany[];
    },
  });

export const homeRecentProductsQO = () =>
  queryOptions({
    queryKey: ["recent-products"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
