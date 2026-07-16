import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignedUrl, uploadFile, slugify } from "@/lib/portal";
import { Building2, Loader2, Upload, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ["my-company"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").maybeSingle();
      return data;
    },
  });

  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (company?.logo_url) getSignedUrl("company-assets", company.logo_url).then(setLogoUrl);
    if (company?.banner_url) getSignedUrl("company-assets", company.banner_url).then(setBannerUrl);
  }, [company?.logo_url, company?.banner_url]);

  if (isLoading || !company) return <div className="mx-auto max-w-3xl h-64 animate-pulse rounded-lg bg-muted" />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const updates = {
      name,
      slug: slugify(name) || company.slug,
      tagline: String(form.get("tagline") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
      website: String(form.get("website") ?? "").trim() || null,
      instagram: String(form.get("instagram") ?? "").trim() || null,
      facebook: String(form.get("facebook") ?? "").trim() || null,
      linkedin: String(form.get("linkedin") ?? "").trim() || null,
      city: String(form.get("city") ?? "").trim() || null,
      state: String(form.get("state") ?? "").trim() || null,
      cnpj: String(form.get("cnpj") ?? "").trim() || null,
    };
    const { error } = await supabase.from("companies").update(updates).eq("id", company.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
    qc.invalidateQueries({ queryKey: ["my-company"] });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "banner",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 5MB)");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${company.id}/${kind}-${Date.now()}.${ext}`;
    try {
      await uploadFile("company-assets", path, file);
      const updates = kind === "logo" ? { logo_url: path } : { banner_url: path };
      const { error } = await supabase.from("companies").update(updates).eq("id", company.id);
      if (error) throw error;
      toast.success(`${kind === "logo" ? "Logo" : "Banner"} atualizado!`);
      qc.invalidateQueries({ queryKey: ["my-company"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Perfil da empresa</h1>
        <p className="mt-1 text-muted-foreground">
          Essas informações aparecem na sua página pública.
        </p>
      </div>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader
            label="Logo"
            currentUrl={logoUrl}
            fallback={<Building2 className="h-6 w-6" />}
            aspectClass="aspect-square w-24"
            onChange={(e) => handleFileUpload(e, "logo")}
          />
          <ImageUploader
            label="Banner (aparece no topo da sua página)"
            currentUrl={bannerUrl}
            fallback={<ImageIcon className="h-6 w-6" />}
            aspectClass="aspect-[3/1] w-full max-w-md"
            onChange={(e) => handleFileUpload(e, "banner")}
          />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações principais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome da empresa" name="name" defaultValue={company.name} required maxLength={120} />
            <Field label="Slogan / tagline" name="tagline" defaultValue={company.tagline ?? ""} maxLength={160} />
            <TextField label="Descrição" name="description" defaultValue={company.description ?? ""} rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" name="city" defaultValue={company.city ?? ""} />
              <Field label="Estado (UF)" name="state" defaultValue={company.state ?? ""} maxLength={2} />
            </div>
            <Field label="CNPJ" name="cnpj" defaultValue={company.cnpj ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="E-mail" name="email" type="email" defaultValue={company.email ?? ""} />
            <Field label="Telefone" name="phone" defaultValue={company.phone ?? ""} />
            <Field label="WhatsApp (com DDD, apenas números)" name="whatsapp" defaultValue={company.whatsapp ?? ""} placeholder="11999999999" />
            <Field label="Site" name="website" type="url" defaultValue={company.website ?? ""} placeholder="https://" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Redes sociais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Instagram (URL)" name="instagram" type="url" defaultValue={company.instagram ?? ""} placeholder="https://instagram.com/..." />
            <Field label="Facebook (URL)" name="facebook" type="url" defaultValue={company.facebook ?? ""} placeholder="https://facebook.com/..." />
            <Field label="LinkedIn (URL)" name="linkedin" type="url" defaultValue={company.linkedin ?? ""} placeholder="https://linkedin.com/..." />
          </CardContent>
        </Card>

        <div className="sticky bottom-16 z-10 flex justify-end md:bottom-0">
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
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

function ImageUploader({
  label,
  currentUrl,
  fallback,
  aspectClass,
  onChange,
}: {
  label: string;
  currentUrl: string | null;
  fallback: React.ReactNode;
  aspectClass: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex items-center gap-4">
        <div className={`overflow-hidden rounded-lg border bg-muted flex items-center justify-center text-muted-foreground ${aspectClass}`}>
          {currentUrl ? (
            <img loading="lazy" decoding="async" src={currentUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            fallback
          )}
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="sr-only" onChange={onChange} />
          <span className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <Upload className="h-4 w-4" />
            Enviar imagem
          </span>
        </label>
      </div>
    </div>
  );
}
