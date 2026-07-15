import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Search, MapPin } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas de Brindes — BrindesHub" },
      { name: "description", content: "Descubra todas as empresas de brindes cadastradas no BrindesHub." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const [q, setQ] = useState("");
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies", q],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, slug, name, tagline, city, state")
        .eq("status", "approved")
        .order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Empresas cadastradas</h1>
          <p className="mt-2 text-muted-foreground">
            {companies?.length ?? 0} {companies?.length === 1 ? "empresa" : "empresas"} de brindes prontas para atender você
          </p>
          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-card" />
              ))}
            {companies?.map((c) => (
              <Link key={c.id} to="/empresa/$slug" params={{ slug: c.slug }}>
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{c.name}</h3>
                        {c.tagline && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>
                        )}
                        {(c.city || c.state) && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[c.city, c.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {companies && companies.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                Nenhuma empresa encontrada.
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
