import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
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
import { productSchema, priceTierSchema, type ProductInput } from "@/lib/schemas";
import { pgErrorMessage } from "@/lib/pg-errors";
import {
  PriceTiersEditor,
  draftsToTiers,
  type PriceTierDraft,
} from "@/components/price-tiers-editor";
import { FacetsPicker } from "@/components/facets-picker";
import { dedupeFacetIds, facetSelectionSchema } from "@/lib/facets";
import { validateTiers } from "@/lib/price-tiers";
import { Loader2, Upload, X } from "lucide-react";


type ImageState = {
  id?: string;
  path: string;
  previewUrl: string | null;
  sort_order: number;
  isNew?: boolean;
  file?: File;
};

type FormValues = {
  name: string;
  category_id: string | null;
  short_description: string;
  description: string;
  price: string;
  price_on_request: boolean;
  material: string;
  dimensions: string;
  colors: string;
  min_order_quantity: string;
  production_time_days: string;
  customization_options: string;
  is_active: boolean;
  promo_price: string;
  is_clearance: boolean;
  is_unusual: boolean;
  video_url: string;
};

function toFormValues(initial?: Partial<ProductInput>): FormValues {
  return {
    name: initial?.name ?? "",
    category_id: initial?.category_id ?? null,
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    price: initial?.price != null ? String(initial.price) : "",
    price_on_request: initial?.price_on_request ?? false,
    material: initial?.material ?? "",
    dimensions: initial?.dimensions ?? "",
    colors: initial?.colors?.join(", ") ?? "",
    min_order_quantity: initial?.min_order_quantity != null ? String(initial.min_order_quantity) : "",
    production_time_days: initial?.production_time_days != null ? String(initial.production_time_days) : "",
    customization_options: initial?.customization_options ?? "",
    is_active: initial?.is_active ?? true,
    promo_price: initial?.promo_price != null ? String(initial.promo_price) : "",
    is_clearance: initial?.is_clearance ?? false,
    is_unusual: initial?.is_unusual ?? false,
    video_url: initial?.video_url ?? "",
  };
}

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

  const [images, setImages] = useState<ImageState[]>([]);
  const [tierDrafts, setTierDrafts] = useState<PriceTierDraft[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(!productId);


  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: toFormValues(initial),
  });

  const priceOnRequest = watch("price_on_request");

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const [imagesRes, tiersRes] = await Promise.all([
        supabase
          .from("product_images")
          .select("id, url, sort_order")
          .eq("product_id", productId)
          .order("sort_order"),
        supabase
          .from("product_price_tiers")
          .select("id, min_qty, max_qty, unit_price")
          .eq("product_id", productId)
          .order("min_qty"),
      ]);
      const rows = imagesRes.data ?? [];
      const withUrls = await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          path: r.url,
          previewUrl: await getSignedUrl("product-images", r.url),
          sort_order: r.sort_order,
        })),
      );
      setImages(withUrls);
      setTierDrafts(
        (tiersRes.data ?? []).map((t) => ({
          key: t.id,
          min_qty: String(t.min_qty),
          max_qty: t.max_qty == null ? "" : String(t.max_qty),
          unit_price: String(t.unit_price),
        })),
      );
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

  const onSubmit = handleSubmit(async (values) => {
    const priceRaw = values.price.replace(",", ".").trim();
    const priceNum = values.price_on_request || !priceRaw ? null : Number(priceRaw);
    if (priceNum !== null && (Number.isNaN(priceNum) || priceNum < 0)) {
      return toast.error("Preço inválido");
    }

    const promoRaw = values.promo_price.replace(",", ".").trim();
    const promoNum = values.price_on_request || !promoRaw ? null : Number(promoRaw);
    if (promoNum !== null && (Number.isNaN(promoNum) || promoNum < 0)) {
      return toast.error("Preço promocional inválido");
    }

    const parsed = productSchema.safeParse({
      name: values.name,
      category_id: values.category_id || null,
      short_description: values.short_description.trim() || null,
      description: values.description.trim() || null,
      price: priceNum,
      price_on_request: values.price_on_request,
      material: values.material.trim() || null,
      dimensions: values.dimensions.trim() || null,
      colors: values.colors.trim()
        ? values.colors.split(",").map((c) => c.trim()).filter(Boolean)
        : null,
      min_order_quantity: values.min_order_quantity ? Number(values.min_order_quantity) : null,
      production_time_days: values.production_time_days ? Number(values.production_time_days) : null,
      customization_options: values.customization_options.trim() || null,
      is_active: values.is_active,
      promo_price: promoNum,
      is_clearance: values.is_clearance,
      is_unusual: values.is_unusual,
      video_url: values.video_url.trim() || null,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return toast.error(first?.message ?? "Dados inválidos");
    }

    // Faixas de preço: valida cada linha isoladamente e depois o conjunto
    // (ordem, sobreposição e limite), espelhando as regras do banco.
    const tiers = draftsToTiers(tierDrafts);
    for (const tier of tiers) {
      const tierParsed = priceTierSchema.safeParse(tier);
      if (!tierParsed.success) {
        return toast.error(tierParsed.error.issues[0]?.message ?? "Faixa de preço inválida.");
      }
    }
    const tiersError = tiers.length > 0 ? validateTiers(tiers) : null;
    if (tiersError) return toast.error(tiersError);

    const payload = { ...parsed.data, company_id: companyId };


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

      // Substituição atômica do ponto de vista do usuário: apaga as faixas
      // antigas e reinsere as atuais em uma única ida ao banco.
      await supabase.from("product_price_tiers").delete().eq("product_id", finalProductId!);
      if (tiers.length > 0) {
        const { error: tierErr } = await supabase.from("product_price_tiers").insert(
          tiers.map((t) => ({ ...t, product_id: finalProductId! })),
        );
        if (tierErr) throw tierErr;
      }

      toast.success(productId ? "Produto atualizado!" : "Produto criado!");
      qc.invalidateQueries({ queryKey: ["my-products"] });
      navigate({ to: "/painel/produtos" });

    } catch (err: unknown) {
      toast.error(pgErrorMessage(err, "Erro ao salvar produto"));
    }
  });

  if (!initialLoaded) return <div className="h-64 animate-pulse rounded-lg bg-card" />;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
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
                  <img loading="lazy" decoding="async" src={img.previewUrl} alt="" className="h-full w-full object-cover" />
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
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" maxLength={200} {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category_id">Categoria</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value ?? undefined} onValueChange={(v) => field.onChange(v || null)}>
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="short_description">Descrição curta (uma linha)</Label>
            <Textarea id="short_description" rows={2} maxLength={300} {...register("short_description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição completa</Label>
            <Textarea id="description" rows={6} {...register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preço e pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="price_on_request"
              render={({ field }) => (
                <Switch id="price_on_request" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="price_on_request" className="cursor-pointer">Preço sob consulta</Label>
          </div>
          {!priceOnRequest && (
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="text" placeholder="Ex: 15.90" {...register("price")} />
            </div>
          )}
          {!priceOnRequest && (
            <div className="space-y-1.5">
              <Label htmlFor="promo_price">Preço promocional (R$)</Label>
              <Input id="promo_price" type="text" placeholder="Ex: 12.90" {...register("promo_price")} />
              <p className="text-xs text-muted-foreground">
                Se preenchido, o produto aparece em <strong>/ofertas</strong> com o desconto calculado automaticamente.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min_order_quantity">Pedido mínimo</Label>
              <Input id="min_order_quantity" type="number" min={1} {...register("min_order_quantity")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="production_time_days">Prazo de produção (dias)</Label>
              <Input id="production_time_days" type="number" min={1} {...register("production_time_days")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <PriceTiersEditor drafts={tierDrafts} onChange={setTierDrafts} />


      <Card>
        <CardHeader><CardTitle className="text-base">Especificações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="material">Material</Label>
            <Input id="material" placeholder="Ex: Plástico ABS" {...register("material")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dimensions">Dimensões</Label>
            <Input id="dimensions" placeholder="Ex: 10 x 5 x 2 cm" {...register("dimensions")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colors">Cores (separadas por vírgula)</Label>
            <Input id="colors" placeholder="Ex: Azul, Vermelho, Preto" {...register("colors")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customization_options">Opções de personalização</Label>
            <Textarea id="customization_options" rows={3} placeholder="Ex: Logo em silk-screen, gravação a laser..." {...register("customization_options")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Vitrines e mídia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="is_clearance"
              render={({ field }) => (
                <Switch id="is_clearance" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="is_clearance" className="cursor-pointer">
              Ponta de estoque <span className="text-muted-foreground">(exibe em /ofertas)</span>
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="is_unusual"
              render={({ field }) => (
                <Switch id="is_unusual" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="is_unusual" className="cursor-pointer">
              Brinde inusitado <span className="text-muted-foreground">(exibe em /inusitados)</span>
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video_url">Vídeo do produto (URL)</Label>
            <Input id="video_url" type="url" placeholder="https://www.youtube.com/watch?v=..." {...register("video_url")} />
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="is_active" className="cursor-pointer">Produto ativo (visível no portal)</Label>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 flex justify-end gap-2 md:bottom-0">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/painel/produtos" })}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {productId ? "Salvar alterações" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
