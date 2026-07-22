import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";

const URL_CANONICAL = "https://brinde-gallery.lovable.app/contato";
const TITLE = "Contato — BrindesHub";
const DESC =
  "Fale com o time do BrindesHub: dúvidas comerciais, parcerias, imprensa e suporte a fornecedores cadastrados.";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  subject: z.string().trim().min(3, "Informe um assunto").max(150),
  message: z.string().trim().min(10, "Mensagem muito curta").max(2000),
  hp: z.string().max(0).optional(), // honeypot
});

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL_CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: TITLE,
          url: URL_CANONICAL,
          inLanguage: "pt-BR",
          publisher: {
            "@type": "Organization",
            name: "BrindesHub",
            url: "https://brinde-gallery.lovable.app",
            email: "contato@brindeshub.com.br",
          },
        }),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msgLen, setMsgLen] = useState(0);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
      hp: String(fd.get("hp") ?? ""),
    };
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    // Abre o cliente de e-mail do usuário — sem backend adicional.
    const body =
      `Nome: ${parsed.data.name}\n` +
      `E-mail: ${parsed.data.email}\n\n` +
      `${parsed.data.message}\n`;
    const mailto = `mailto:contato@brindeshub.com.br?subject=${encodeURIComponent(
      `[Contato] ${parsed.data.subject}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success("Abrindo seu cliente de e-mail para enviar a mensagem.");
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Fale com a gente</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Contato</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Envie sua dúvida comercial, sugestão ou pedido de parceria. Respondemos em até 2 dias úteis.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-start gap-2 p-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="font-semibold">E-mail</h2>
            <a href="mailto:contato@brindeshub.com.br" className="text-sm text-primary hover:underline">
              contato@brindeshub.com.br
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-2 p-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="font-semibold">Suporte a fornecedores</h2>
            <a href="mailto:suporte@brindeshub.com.br" className="text-sm text-primary hover:underline">
              suporte@brindeshub.com.br
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-start gap-2 p-5">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="font-semibold">Privacidade (LGPD)</h2>
            <a href="mailto:privacidade@brindeshub.com.br" className="text-sm text-primary hover:underline">
              privacidade@brindeshub.com.br
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-lg font-semibold">Envie uma mensagem</h2>
          <form className="mt-4 grid gap-4" onSubmit={onSubmit} noValidate>
            {/* Honeypot */}
            <div aria-hidden className="hidden" tabIndex={-1}>
              <label>
                Não preencha
                <input type="text" name="hp" autoComplete="off" tabIndex={-1} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" autoComplete="name" required maxLength={100} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required maxLength={255} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" name="subject" required maxLength={150} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                name="message"
                required
                maxLength={2000}
                rows={6}
                onChange={(e) => setMsgLen(e.currentTarget.value.length)}
              />
              <div className="flex items-center justify-between">
                {errors.message ? (
                  <p className="text-xs text-destructive">{errors.message}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">{2000 - msgLen} caracteres restantes</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Ao enviar você concorda com nossa Política de Privacidade.
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
