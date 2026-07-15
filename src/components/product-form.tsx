import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getSignedUrl, uploadFile, deleteFile } from "@/lib/portal";
import { Loader2, Upload, X, GripVertical } from "lucide-react";

export type ProductInput = {
  id?: string;
  name: string;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  price: number | null;
  price_on_request: boolean;
  material: string | null;
  dimensions: string | null;
  colors: string[] | null;
  min_order_quantity: number | null;
  production_time_days: number | null;
  customization_options: string | null;
  is_active: boolean;
};

type ImageState = {
  id?: string; // db row id when existing
  path: string; // storage path
  previewUrl: string | null;
  sort_order: number;
  isNew?: boolean;
  file?: File;
};

export function ProductForm({
  companyId,
  initial,
  productId,
}: {
  companyId: string;
  initial?: Partial<ProductInput>;
  productId?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ImageState[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(!productId);
  const [priceOnRequest, setPriceOnRequest] = useState(initial?.price_on_request ?? false);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  // Load existing images
  useEffect(() => {
    if (!productId) return;
    (async () => {
      const { data } = await supabase
        .from("product_images")
        .select("id, url, sort_order")
        .eq("product_id", productId)
        .order("sort_order");
      const rows = data ?? [];
      const withUrls = await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          path: r.url,
          previewUrl: await getSignedUrl("product-images", r.url),
          sort_order: r.sort_order,
        })),
      );
      setImages(withUrls);
      setInitialLoaded(true);
    })();
  }, [productId]);

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const startOrder = images.length;
    const newOnes: ImageState[] = files.map((file, i) => ({
      path: `${companyId}/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`,
      previewUrl: URL.createObjectURL(file),
      sort_order: startOrder + i,
      isNew: true,
      file,
    }));
    setImages((prev) => [...prev, ...newOnes]);
    e.target.value = "";
  };

  const removeImage = async (idx: number) => {
    const img = images[idx];
    if (img.id) {
      await supabase.from("product_images").delete().eq("id", img.id);
      await deleteFile("product-images", img.path);
    }
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const priceRaw = String(form.get("price") ?? "").replace(",", ".");
    const price = priceOnRequest || !priceRaw ? null : Number(priceRaw);
    if (price !== null && (Number.isNaN(price) || price < 0)) {
      setSaving(false);
      return toast.error("Preço inválido");
    }
    const colorsRaw = String(form.get("colors") ?? "").trim();

    const payload = {
      company_id: companyId,
      name: String(form.get("name") ?? "").trim(),
      category_id: (form.get("category_id") as string) || null,
      short_description: String(form.get("short_description") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      price,
      price_on_request: priceOnRequest,
      material: String(form.get("material") ?? "").trim() || null,
      dimensions: String(form.get("dimensions") ?? "").trim() || null,
      colors: colorsRaw ? colorsRaw.split(",").map((c) => c.trim()).filter(Boolean) : null,
      min_order_quantity: form.get("min_order_quantity")
        ? Number(form.get("min_order_quantity"))
        : null,
      production_time_days: form.get("production_time_days")
        ? Number(form.get("production_time_days"))
        : null,
      customization_options: String(form.get("customization_options") ?? "").trim() || null,
      is_active: isActive,
    };

    if (!payload.name) {
      setSaving(false);
      return toast.error("Nome é obrigatório");
    }

    try {
      let finalProductId = productId;
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        finalProductId = data.id;
      }

      // Upload new images + insert rows
      for (const img of images) {
        if (img.isNew && img.file) {
          await uploadFile("product-images", img.path, img.file);
          await supabase.from("product_images").insert({
            product_id: finalProductId!,
            url: img.path,
            sort_order: img.sort_order,
            is_primary: img.sort_order === 0,
          });
        } else if (img.id) {
          await supabase.from("product_images").update({ sort_order: img.sort_order }).eq("id", img.id);
        }
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado!");
      qc.invalidateQueries({ queryKey: ["my-products"] });
      navigate({ to: "/painel/produtos" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!initialLoaded) return <div className="h-64 animate-pulse rounded-lg bg-card" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos do produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {img.previewUrl && (
                  <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                )}
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
              <input type="file" accept="image/*" multiple className="sr-only" onChange={handleAddImages} />
              <Upload className="h-5 w-5" />
              <span className="text-xs">Adicionar</span>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">A primeira imagem é usada como capa.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Informações do produto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nome" name="name" defaultValue={initial?.name ?? ""} required maxLength={200} />
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Categoria</Label>
            <Select name="category_id" defaultValue={initial?.category_id ?? undefined}>
              <SelectTrigger id="category_id">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextField label="Descrição curta (uma linha)" name="short_description" defaultValue={initial?.short_description ?? ""} rows={2} maxLength={300} />
          <TextField label="Descrição completa" name="description" defaultValue={initial?.description ?? ""} rows={6} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preço e pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="price_on_request" checked={priceOnRequest} onCheckedChange={setPriceOnRequest} />
            <Label htmlFor="price_on_request" className="cursor-pointer">Preço sob consulta</Label>
          </div>
          {!priceOnRequest && (
            <Field label="Preço (R$)" name="price" type="text" defaultValue={initial?.price?.toString() ?? ""} placeholder="Ex: 15.90" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pedido mínimo" name="min_order_quantity" type="number" min={1} defaultValue={initial?.min_order_quantity?.toString() ?? ""} />
            <Field label="Prazo de produção (dias)" name="production_time_days" type="number" min={1} defaultValue={initial?.production_time_days?.toString() ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Especificações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Material" name="material" defaultValue={initial?.material ?? ""} placeholder="Ex: Plástico ABS" />
          <Field label="Dimensões" name="dimensions" defaultValue={initial?.dimensions ?? ""} placeholder="Ex: 10 x 5 x 2 cm" />
          <Field label="Cores (separadas por vírgula)" name="colors" defaultValue={initial?.colors?.join(", ") ?? ""} placeholder="Ex: Azul, Vermelho, Preto" />
          <TextField label="Opções de personalização" name="customization_options" defaultValue={initial?.customization_options ?? ""} rows={3} placeholder="Ex: Logo em silk-screen, gravação a laser..." />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="is_active" className="cursor-pointer">Produto ativo (visível no portal)</Label>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 flex justify-end gap-2 md:bottom-0">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/painel/produtos" })}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {productId ? "Salvar alterações" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, name, ...rest } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}

function TextField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, name, ...rest } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} {...rest} />
    </div>
  );
}
