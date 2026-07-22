import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Send, ShieldAlert, Clock } from "lucide-react";
import { leadSchema } from "@/lib/schemas";
import { pgErrorMessage } from "@/lib/pg-errors";

type Props = {
  companyId: string;
  productId?: string;
  productName?: string;
};

const MSG_MAX = 2000;
const COOLDOWN_HOUR_SECONDS = 60 * 15; // 15 min sugerido após limite/h
const COOLDOWN_DAY_SECONDS = 60 * 60; // 60 min sugerido após limite diário

function isRateLimitError(err: unknown): "hour" | "day" | null {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  if (msg.includes("diário") || msg.includes("diario")) return "day";
  if (msg.includes("limite de envios") || msg.includes("aguarde antes de enviar")) return "hour";
  return null;
}

export function LeadForm({ companyId, productId, productName }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    quantity: "",
    message: productName
      ? `Olá! Tenho interesse no produto "${productName}". Poderia me enviar mais informações?`
      : "",
    website: "", // honeypot
  });
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const inCooldown = secondsLeft > 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.website.trim().length > 0) {
        // honeypot preenchido — bot; simula sucesso silencioso
        return;
      }
      const quantity = form.quantity.trim() ? parseInt(form.quantity, 10) : null;
      const parsed = leadSchema.safeParse({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        quantity,
        message: form.message,
      });
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? "Dados inválidos.");
      }
      const { error } = await supabase.from("leads").insert({
        company_id: companyId,
        product_id: productId ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        quantity: parsed.data.quantity ?? null,
        message: parsed.data.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      toast.success("Pedido enviado! A empresa vai retornar em breve.");
    },
    onError: (err: unknown) => {
      const kind = isRateLimitError(err);
      if (kind) {
        const secs = kind === "day" ? COOLDOWN_DAY_SECONDS : COOLDOWN_HOUR_SECONDS;
        setCooldownUntil(Date.now() + secs * 1000);
        toast.error(
          kind === "day"
            ? "Você atingiu o limite diário de contatos para esta empresa. Tente novamente mais tarde."
            : "Muitos envios em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
        );
        return;
      }
      toast.error(pgErrorMessage(err, "Não foi possível enviar seu pedido."));
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

  const remainingChars = MSG_MAX - form.message.length;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold">Pedir orçamento</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie seus dados e receba uma proposta personalizada.
        </p>

        {inCooldown && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Envio temporariamente bloqueado</p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Tente novamente em {mm}:{ss}.
              </p>
            </div>
          </div>
        )}

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (inCooldown) return;
            mutation.mutate();
          }}
        >
          {/* Honeypot anti-bot: escondido de humanos */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="lead-website">Não preencha este campo</label>
            <input
              id="lead-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
            />
          </div>

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
            <div className="flex items-center justify-between">
              <Label htmlFor="lead-msg">Mensagem</Label>
              <span
                className={`text-xs ${
                  remainingChars < 100 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {remainingChars} caracteres restantes
              </span>
            </div>
            <Textarea
              id="lead-msg"
              required
              minLength={10}
              maxLength={MSG_MAX}
              rows={4}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || inCooldown}
          >
            <Send className="mr-2 h-4 w-4" />
            {inCooldown
              ? `Aguarde ${mm}:${ss}`
              : mutation.isPending
              ? "Enviando…"
              : "Enviar pedido"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
