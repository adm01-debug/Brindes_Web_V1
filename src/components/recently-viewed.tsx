import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mediaUrl, formatBRL } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";

interface RecentlyViewedProps {
  excludeId?: string;
  title?: string;
  className?: string;
}

export function RecentlyViewed({ excludeId, title = "Vistos recentemente", className }: RecentlyViewedProps) {
  const { ids, clear } = useRecentlyViewed();
  const filtered = ids.filter((id) => id !== excludeId).slice(0, 6);

  const { data } = useQuery({
    queryKey: ["recently-viewed", filtered.join(",")],
    enabled: filtered.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, price_on_request, currency, company:companies!inner(slug, name, status), images:product_images(url, is_primary, sort_order)")
        .in("id", filtered)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("moderation_status", "approved")
        .eq("company.status", "approved");
      if (error) throw error;
      // preservar ordem do histórico
      const map = new Map((data ?? []).map((p) => [p.id, p]));
      return filtered.map((id) => map.get(id)).filter(Boolean) as NonNullable<typeof data>;
    },
  });

  // URLs estáveis (rota /i/...): sem round-trip de assinatura no cliente.
  const urls: Record<string, string> = Object.fromEntries(
    (data ?? []).map((p) => {
      const imgs = (p.images ?? [])
        .slice()
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
      return [p.id, mediaUrl("product-images", imgs[0]?.url) ?? ""] as const;
    }),
  );

  if (!data || data.length === 0) return null;

  return (
    <section className={className} aria-labelledby="recently-viewed-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="recently-viewed-title" className="text-xl font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={clear}>Limpar</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.map((p) => (
          <Link key={p.id} to="/produto/$id" params={{ id: p.id }} className="group">
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="aspect-square bg-muted">
                {urls[p.id] ? (
                  <img
                    width={240}
                    height={240}
                    src={urls[p.id]}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-6 w-6" aria-hidden />
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.price_on_request || p.price == null
                    ? "Sob consulta"
                    : formatBRL(Number(p.price))}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
