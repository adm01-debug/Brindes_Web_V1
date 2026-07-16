import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Send } from "lucide-react";

type Props = {
  companyId: string;
  productId?: string;
  productName?: string;
};

export function LeadForm({ companyId, productId, productName }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: "",
    message: productName ? `Olá! Tenho interesse no produto "${productName}". Poderia me enviar mais informações?` : "",
  });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const quantity = form.quantity.trim() ? parseInt(form.quantity, 10) : null;
      if (form.quantity.trim() && (Number.isNaN(quantity!) || quantity! <= 0)) {
        throw new Error("Quantidade inválida.");
      }
      const { error } = await supabase.from("leads").insert({
        company_id: companyId,
        product_id: productId ?? null,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        quantity,
        message: form.message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Pedido enviado! A empresa vai retornar em breve.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Não foi possível enviar seu pedido.");
    },
  });

  if (sent) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 font-semibold">Pedido enviado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A empresa recebeu seus dados e vai entrar em contato pelo email informado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold">Pedir orçamento</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie seus dados e receba uma proposta personalizada.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome</Label>
            <Input
              id="lead-name"
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Telefone (opcional)</Label>
              <Input
                id="lead-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-qty">Quantidade estimada (opcional)</Label>
            <Input
              id="lead-qty"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-msg">Mensagem</Label>
            <Textarea
              id="lead-msg"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Enviando…" : "Enviar pedido"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
