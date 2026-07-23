import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Send, Package, Trash2, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuoteCart, type QuoteCartItem } from "@/hooks/use-quote-cart";
import { supabase } from "@/integrations/supabase/client";
import { pgErrorMessage } from "@/lib/pg-errors";

export const Route = createFileRoute("/orcamento")({
  component: OrcamentoPage,
  head: () => ({
    meta: [
      { title: "Finalizar orçamento — BrindesHub" },
      {
        name: "description",
        content:
          "Envie seu pedido de orçamento para múltiplas empresas de uma só vez. Rápido, gratuito e sem compromisso.",
      },
      { property: "og:title", content: "Finalizar orçamento — BrindesHub" },
      {
        property: "og:description",
        content: "Envie seu pedido de orçamento para múltiplas empresas de uma só vez.",
      },
      { property: "og:url", content: "https://brinde-gallery.lovable.app/orcamento" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().trim().email("Email inválido.").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Mensagem deve ter no mínimo 10 caracteres.")
    .max(2000, "Mensagem muito longa."),
  website: z.string().max(0, "Campo inválido.").optional(), // honeypot
});

type CustomerInput = z.infer<typeof customerSchema>;

function groupByCompany(items: QuoteCartItem[]) {
  const groups = new Map<string, { company_name: string | null; items: QuoteCartItem[] }>();
  for (const it of items) {
    const g = groups.get(it.company_id);
    if (g) g.items.push(it);
    else groups.set(it.company_id, { company_name: it.company_name, items: [it] });
  }
  return Array.from(groups.entries()).map(([company_id, v]) => ({ company_id, ...v }));
}

function OrcamentoPage() {
  const { items, remove, clear, hydrated } = useQuoteCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CustomerInput>({
    name: "",
    email: "",
    phone: "",
    message: "Olá! Gostaria de receber um orçamento para os produtos abaixo.",
    website: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});

  const groups = useMemo(() => groupByCompany(items), [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (form.website && form.website.length > 0) {
      // honeypot preenchido: finge sucesso
      toast.success("Pedido enviado.");
      clear();
      navigate({ to: "/orcamento/enviado", search: { c: 0, l: 0 } });
      return;
    }

    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CustomerInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CustomerInput | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Verifique os campos destacados.");
      return;
    }
    setErrors({});

    if (items.length === 0) {
      toast.error("Adicione ao menos um produto ao orçamento.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_quote_cart", {
        _customer: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          message: parsed.data.message,
        },
        _items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity ?? null,
          notes: i.notes ?? null,
        })),
      });
      if (error) throw error;
      const result = (data ?? {}) as { leads_created?: number; companies_notified?: number };
      clear();
      toast.success("Pedido enviado com sucesso!");
      navigate({
        to: "/orcamento/enviado",
        search: {
          c: result.companies_notified ?? 0,
          l: result.leads_created ?? 0,
        },
      });
    } catch (err) {
      toast.error(pgErrorMessage(err) ?? "Não foi possível enviar. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hydrated && items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="conteudo" className="flex-1 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Orçamento" }]} />
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Package className="h-8 w-8 text-muted-foreground" aria-hidden />
                </div>
                <h1 className="text-xl font-semibold">Seu carrinho de orçamento está vazio</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Adicione produtos que você quer orçar navegando pelo catálogo. Você pode juntar itens de várias empresas — enviamos um pedido separado para cada uma.
                </p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to="/buscar">Explorar produtos</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/empresas">Ver empresas</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumbs className="mb-4" items={[{ label: "Orçamento" }]} />

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Finalizar orçamento</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "itens"} de {groups.length}{" "}
                {groups.length === 1 ? "empresa" : "empresas"}. Cada empresa recebe seu pedido separadamente.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/buscar">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Continuar comprando
              </Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Coluna: itens agrupados */}
            <div className="space-y-4">
              {groups.map((g) => (
                <Card key={g.company_id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {g.company_name ?? "Empresa"}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {g.items.length} {g.items.length === 1 ? "item" : "itens"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {g.items.map((it) => (
                      <div
                        key={it.product_id}
                        className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <Link
                            to="/produto/$id"
                            params={{ id: it.product_id }}
                            className="line-clamp-1 text-sm font-medium hover:text-primary"
                          >
                            {it.product_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {it.quantity ? `Qtd: ${it.quantity}` : "Sem quantidade definida"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(it.product_id)}
                          aria-label={`Remover ${it.product_name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coluna: seus dados */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Seus dados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="q-name">Nome *</Label>
                    <Input
                      id="q-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      maxLength={120}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="q-email">Email *</Label>
                    <Input
                      id="q-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                      maxLength={255}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="q-phone">Telefone / WhatsApp</Label>
                    <Input
                      id="q-phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      maxLength={30}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="q-message">Mensagem *</Label>
                    <Textarea
                      id="q-message"
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      required
                      rows={5}
                      maxLength={2000}
                      aria-invalid={!!errors.message}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {form.message.length}/2000
                    </p>
                    {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                  </div>

                  {/* Honeypot */}
                  <div className="hidden" aria-hidden="true">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
                    <Send className="h-4 w-4" aria-hidden />
                    {submitting ? "Enviando…" : `Enviar para ${groups.length} ${groups.length === 1 ? "empresa" : "empresas"}`}
                  </Button>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Seus dados são compartilhados apenas com as empresas selecionadas.
                  </p>
                </CardContent>
              </Card>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
