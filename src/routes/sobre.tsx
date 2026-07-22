import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Users, ShieldCheck, Sparkles, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o BrindesHub — o marketplace de brindes corporativos do Brasil" },
      {
        name: "description",
        content:
          "Conheça o BrindesHub: a plataforma que conecta empresas a fornecedores verificados de brindes corporativos, com curadoria, agilidade e transparência.",
      },
      { property: "og:title", content: "Sobre o BrindesHub" },
      {
        property: "og:description",
        content:
          "Marketplace brasileiro que conecta compradores a fornecedores verificados de brindes corporativos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sobre o BrindesHub" },
      {
        name: "twitter:description",
        content:
          "Marketplace brasileiro que conecta compradores a fornecedores verificados de brindes corporativos.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Nossa história</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
          Conectamos empresas aos melhores fornecedores de brindes do Brasil
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">
          O BrindesHub nasceu para resolver um problema real: encontrar fornecedores confiáveis
          de brindes corporativos, comparar propostas e fechar pedidos com segurança — tudo em um só lugar.
        </p>
      </header>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Comunidade curada",
            text: "Empresas fornecedoras passam por moderação antes de aparecer no catálogo.",
          },
          {
            icon: ShieldCheck,
            title: "Contato direto e seguro",
            text: "Você fala diretamente com o fornecedor, sem intermediários que encarecem o pedido.",
          },
          {
            icon: Sparkles,
            title: "Descoberta simples",
            text: "Busca inteligente por produto, categoria, cidade e estado, com filtros ágeis.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Como funciona</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Search, title: "1. Busque", text: "Explore produtos e empresas por categoria, cidade ou estado." },
            { icon: MessageSquare, title: "2. Solicite orçamento", text: "Envie seu pedido em segundos pelo formulário integrado." },
            { icon: Building2, title: "3. Feche direto", text: "Negocie e feche o pedido diretamente com o fornecedor." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-lg border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          É fornecedor de brindes? Cadastre sua empresa gratuitamente
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Publique seu catálogo, receba pedidos qualificados e conquiste novos clientes no maior
          marketplace brasileiro do setor.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>Cadastrar minha empresa</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/empresas">Ver empresas cadastradas</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
