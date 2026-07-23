import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Package2 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const URL_CANONICAL = "https://brinde-gallery.lovable.app/planos";
const TITLE = "Planos e destaques — BrindesHub";
const DESC =
  "Ganhe visibilidade no BrindesHub: planos Free, Pro e Premium com destaque na home, ordenação prioritária e badges nas vitrines de produtos.";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL_CANONICAL }],
  }),
  component: PlanosPage,
});

type Plan = {
  id: "free" | "pro" | "premium";
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  icon: typeof Package2;
  features: string[];
  highlight?: boolean;
  cta: string;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    priceSuffix: "para sempre",
    tagline: "Comece a receber leads sem custo.",
    icon: Package2,
    cta: "Cadastrar grátis",
    features: [
      "Página institucional da empresa",
      "Até 20 produtos publicados",
      "Recebimento de leads por e-mail",
      "Aparição nas buscas do portal",
      "Painel de gestão básico",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 149",
    priceSuffix: "/ mês",
    tagline: "Ganhe destaque nas listagens.",
    icon: Sparkles,
    highlight: true,
    cta: "Falar com o comercial",
    features: [
      "Tudo do Free",
      "Badge Destaque em todos os produtos",
      "Prioridade nas listagens de empresas",
      "Até 100 produtos publicados",
      "Analytics de visualizações e leads",
      "Exportação de leads em CSV",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 399",
    priceSuffix: "/ mês",
    tagline: "Máxima visibilidade e vitrine na home.",
    icon: Crown,
    cta: "Falar com o comercial",
    features: [
      "Tudo do Pro",
      "Badge Premium com selo dourado",
      "Vitrine em destaque na home",
      "Produtos ilimitados",
      "Kits temáticos patrocinados",
      "Atendimento comercial dedicado",
      "Relatórios mensais de performance",
    ],
  },
];

const faq = [
  {
    q: "Posso testar antes de contratar?",
    a: "Sim. Cadastre-se no plano Free, publique seus produtos e comece a receber leads. Quando quiser mais visibilidade, faça upgrade para Pro ou Premium.",
  },
  {
    q: "Como funciona a cobrança dos planos pagos?",
    a: "A ativação é manual via nosso time comercial. Emitimos nota fiscal e o plano fica ativo por período contratado (mensal, trimestral ou anual, com desconto).",
  },
  {
    q: "O que muda visualmente para meus produtos no Pro/Premium?",
    a: "Produtos de empresas Pro exibem badge Destaque azul; Premium exibe selo dourado. Ambos aparecem primeiro nas buscas e listagens da categoria.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Não há multa. Ao cancelar, o plano permanece ativo até o fim do período pago; depois disso sua empresa volta automaticamente ao plano Free.",
  },
];

function PlanosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: "Planos" }]} />

          <header className="mt-6 text-center">
            <Badge variant="secondary" className="mb-3">Para empresas</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Planos e destaques
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Escolha o plano ideal para sua empresa aparecer primeiro nas buscas,
              ganhar destaque na home e receber mais orçamentos qualificados.
            </p>
          </header>

          <section className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card
                  key={plan.id}
                  className={
                    plan.highlight
                      ? "relative border-primary shadow-lg ring-2 ring-primary/20"
                      : "relative"
                  }
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Mais popular
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                    <div className="mt-3">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.priceSuffix && (
                        <span className="ml-1 text-sm text-muted-foreground">
                          {plan.priceSuffix}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant={plan.highlight ? "default" : "outline"}
                      className="w-full"
                    >
                      {plan.id === "free" ? (
                        <Link to="/auth">{plan.cta}</Link>
                      ) : (
                        <a href={`/contato?plano=${plan.id}`}>{plan.cta}</a>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-16">
            <h2 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {faq.map((item) => (
                <Card key={item.q}>
                  <CardHeader>
                    <CardTitle className="text-base">{item.q}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {item.a}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-xl border bg-muted/30 p-8 text-center">
            <h2 className="text-2xl font-semibold">Pronto para começar?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Cadastre sua empresa gratuitamente em minutos ou fale com nosso comercial
              para conhecer os planos Pro e Premium.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/auth">Cadastrar grátis</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contato">Falar com comercial</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
