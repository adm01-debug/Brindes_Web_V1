import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { slugify } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, EyeOff, Pencil, Plus, ShieldAlert, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/admin/categorias")({
  component: AdminCategoriasPage,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

function AdminCategoriasPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, icon, sort_order, is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-categories-counts"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .is("deleted_at", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (!row.category_id) continue;
        map.set(row.category_id, (map.get(row.category_id) ?? 0) + 1);
      }
      return map;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.is_active ? "Categoria ativada." : "Categoria desativada.");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar."),
  });

  if (checkingAdmin) {
    return <div className="mx-auto max-w-5xl h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground">
              Esta área é exclusiva para administradores do portal.
            </p>
            <Button variant="outline" asChild>
              <Link to="/painel">Voltar ao painel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categorias globais</h1>
          <p className="mt-1 text-muted-foreground">
            Categorias ativas aparecem na busca, home e cadastro de produtos.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (categories ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Tag className="h-8 w-8" />
            <p>Nenhuma categoria cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories!.map((c) => {
            const productCount = counts?.get(c.id) ?? 0;
            return (
              <Card key={c.id} className={c.is_active ? "" : "opacity-70"}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.icon && <span className="text-xl">{c.icon}</span>}
                      <h3 className="font-semibold">{c.name}</h3>
                      {c.is_active ? (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <EyeOff className="h-3 w-3" /> Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>/{c.slug}</span>
                      <span>Ordem: {c.sort_order}</span>
                      <span>
                        {productCount} produto{productCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) =>
                          toggleActive.mutate({ id: c.id, is_active: v })
                        }
                        disabled={toggleActive.isPending}
                        aria-label="Ativa"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryFormDialog
        open={creating}
        onOpenChange={setCreating}
        initial={null}
        onSaved={() => {
          setCreating(false);
          qc.invalidateQueries({ queryKey: ["admin-categories"] });
        }}
      />
      <CategoryFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["admin-categories"] });
          qc.invalidateQueries({ queryKey: ["categories"] });
          qc.invalidateQueries({ queryKey: ["all-categories"] });
        }}
      />
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Category | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      if (!name) {
        toast.error("Informe o nome da categoria.");
        return;
      }
      const slugRaw = String(form.get("slug") ?? "").trim();
      const slug = slugify(slugRaw || name);
      const payload = {
        name,
        slug,
        description: String(form.get("description") ?? "").trim() || null,
        icon: String(form.get("icon") ?? "").trim() || null,
        sort_order: Number(form.get("sort_order") ?? 0) || 0,
        is_active: form.get("is_active") === "on",
      };

      if (initial) {
        const { error } = await supabase.from("categories").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Categoria atualizada.");
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        toast.success("Categoria criada.");
      }
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            O slug é usado nas URLs de busca. Categorias inativas somem da busca pública e do cadastro de produtos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={initial?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={initial?.slug ?? ""}
                placeholder="deixe em branco para gerar automaticamente"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (emoji ou texto)</Label>
              <Input id="icon" name="icon" defaultValue={initial?.icon ?? ""} placeholder="🎁" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Ordem</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={initial?.sort_order ?? 0}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              name="is_active"
              defaultChecked={initial?.is_active ?? true}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Categoria ativa (visível na busca)
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : initial ? "Salvar alterações" : "Criar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
