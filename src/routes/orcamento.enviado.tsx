import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({
  c: z.coerce.number().int().min(0).catch(0),
  l: z.coerce.number().int().min(0).catch(0),
});

export const Route = createFileRoute("/orcamento/enviado")({
  validateSearch: (s) => searchSchema.parse(s),
  component: OrcamentoEnviado,
  head: () => ({
    meta: [
      { title: "Orçamento enviado — BrindesHub" },
      { name: "description", content: "Seu pedido foi enviado com sucesso às empresas selecionadas." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function OrcamentoEnviado() {
  const { c, l } = Route.useSearch();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <CheckCircle2 className="h-10 w-10" aria-hidden />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Pedido enviado com sucesso!</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                {l > 0 ? (
                  <>
                    Enviamos seu pedido para{" "}
                    <strong>
                      {c} {c === 1 ? "empresa" : "empresas"}
                    </strong>{" "}
                    ({l} {l === 1 ? "solicitação" : "solicitações"}). Cada empresa responderá diretamente
                    pelo email informado.
                  </>
                ) : (
                  <>Seu pedido foi registrado. As empresas responderão diretamente pelo email informado.</>
                )}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/buscar">
                    Continuar explorando <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Voltar à página inicial</Link>
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
