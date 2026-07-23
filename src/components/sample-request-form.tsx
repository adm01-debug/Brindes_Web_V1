import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { leadSchema } from "@/lib/schemas";
import { pgErrorMessage } from "@/lib/pg-errors";

type Props = {
  companyId: string;
  productId?: string;
  productName?: string;
};

export function SampleRequestForm({ companyId, productId, productName }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    shipping_address: "",
    shipping_city: "",
    message: productName
      ? `Gostaria de solicitar uma amostra do produto "${productName}" para avaliação.`
      : "Gostaria de solicitar uma amostra para avaliação.",
    website: "",
  });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.website.trim().length > 0) return; // honeypot
      const parsed = leadSchema.safeParse({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        quantity: 1,
        message: form.message,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      }
      if (!form.shipping_address.trim() || !form.shipping_city.trim()) {
        throw new Error("Informe o endereço e a cidade para envio da amostra.");
      }
      const { error } = await supabase.from("leads").insert({
        company_id: companyId,
        product_id: productId ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        quantity: 1,
        message: parsed.data.message,
        kind: "sample",
        shipping_address: form.shipping_address.trim(),
        shipping_city: form.shipping_city.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Solicitação de amostra enviada!");
    },
    onError: (err: unknown) =>
      toast.error(pgErrorMessage(err, "Não foi possível enviar sua solicitação.")),
  });

  if (sent) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 font-semibold">Solicitação enviada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A empresa retornará com informações sobre disponibilidade, custo e prazo de envio da amostra.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Solicitar amostra</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Avalie o produto na prática. A empresa confirma custo e prazo de envio antes do despacho.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="sample-website">Não preencher</label>
            <input
              id="sample-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sample-name">Nome</Label>
            <Input
              id="sample-name"
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sample-email">Email</Label>
              <Input
                id="sample-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sample-phone">Telefone</Label>
              <Input
                id="sample-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sample-addr">Endereço de envio</Label>
            <Input
              id="sample-addr"
              required
              maxLength={200}
              placeholder="Rua, número, complemento"
              value={form.shipping_address}
              onChange={(e) => setForm((s) => ({ ...s, shipping_address: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sample-city">Cidade / UF</Label>
            <Input
              id="sample-city"
              required
              maxLength={120}
              placeholder="Ex.: São Paulo / SP"
              value={form.shipping_city}
              onChange={(e) => setForm((s) => ({ ...s, shipping_city: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sample-msg">Mensagem</Label>
            <Textarea
              id="sample-msg"
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" variant="secondary" disabled={mutation.isPending}>
            <PackageCheck className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Enviando…" : "Solicitar amostra"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
