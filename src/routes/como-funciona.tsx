import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  MessageSquare,
  Handshake,
  Package,
  Building2,
  UploadCloud,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

const URL_CANONICAL = "https://brinde-gallery.lovable.app/como-funciona";
const TITLE = "Como funciona — BrindesHub";
const DESC =
  "Passo a passo do BrindesHub: como compradores encontram fornecedores e como empresas cadastram seus catálogos e recebem contatos.";

const buyerSteps = [
  {
    icon: Search,
    title: "1. Encontre",
    text: "Busque produtos ou empresas por nome, categoria, cidade ou estado. Filtros de preço e ordenação por relevância.",
  },
  {
    icon: MessageSquare,
    title: "2. Solicite orçamento",
    text: "Envie sua necessidade pelo formulário do produto ou empresa. Sem cadastro obrigatório para pedidos simples.",
  },
  {
    icon: Handshake,
    title: "3. Negocie e feche",
    text: "A empresa responde direto no seu e-mail ou WhatsApp. Toda a negociação, prazo e pagamento é entre você e o fornecedor.",
  },
];

const supplierSteps = [
  {
    icon: Building2,
    title: "1. Cadastre sua empresa",
    text: "Crie uma conta gratuita e preencha os dados institucionais: nome, cidade, contatos, logo e apresentação.",
  },
  {
    icon: UploadCloud,
    title: "2. Publique produtos",
    text: "Adicione fotos, descrições, faixa de preço e variações. Categorize para aparecer nas buscas certas.",
  },
  {
    icon: ShieldCheck,
    title: "3. Aprovação",
    text: "Nosso time revisa em até 2 dias úteis. Após aprovado, sua empresa passa a receber leads qualificados.",
  },
  {
    icon: BarChart3,
    title: "4. Gerencie leads",
    text: "Acompanhe visualizações, exporte leads em CSV e responda diretamente pelos contatos informados pelo cliente.",
  },
];

export const Route = createFileRoute("/como-funciona")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Como comprar brindes corporativos no BrindesHub",
          description: DESC,
          step: buyerSteps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.text,
          })),
        }),
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Passo a passo</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Como funciona o BrindesHub</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Uma plataforma simples para conectar quem precisa de brindes a quem produz. Veja o fluxo dos dois lados.
        </p>
      </header>

      <section aria-labelledby="buyers" className="mt-12">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Package className="h-5 w-5" aria-hidden />
          </div>
          <h2 id="buyers" className="text-2xl font-semibold tracking-tight">
            Para compradores
          </h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {buyerSteps.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link to="/buscar">Começar a buscar</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="suppliers" className="mt-16">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <h2 id="suppliers" className="text-2xl font-semibold tracking-tight">
            Para fornecedores
          </h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {supplierSteps.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/auth">Cadastrar empresa</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/faq">Ver perguntas frequentes</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16 rounded-lg border bg-muted/30 p-6 md:p-8">
        <h2 className="text-lg font-semibold">Sem taxas escondidas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O BrindesHub não cobra comissão sobre negócios fechados. Compradores usam a plataforma gratuitamente e
          fornecedores contam com cadastro básico sem custo, com upgrades opcionais.
        </p>
      </section>
    </main>
  );
}
