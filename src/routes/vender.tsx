import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Rocket,
  ShieldCheck,
  Users,
  BarChart3,
  MessageSquare,
  Search,
  Star,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Building2,
  Package,
  Sparkles,
} from "lucide-react";

const URL = "https://brinde-gallery.lovable.app/vender";
const TITLE = "Vender no BrindesHub — Cadastre sua empresa de brindes";
const DESC =
  "Cadastre sua empresa de brindes corporativos gratuitamente, receba orçamentos qualificados e destaque-se com planos Pro e Premium. Sem mensalidade para começar.";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Vender", item: URL },
          ],
        }),
      },
    ],
  }),
  component: SellPage,
});

const BENEFITS = [
  { icon: Users, title: "Compradores qualificados", desc: "Empresas de RH, marketing e eventos buscando fornecedores todos os dias." },
  { icon: MessageSquare, title: "Orçamentos direto no painel", desc: "Receba pedidos completos com quantidade, prazo e detalhes técnicos." },
  { icon: Search, title: "SEO otimizado", desc: "Seus produtos indexados no Google com páginas dedicadas por categoria e cidade." },
  { icon: ShieldCheck, title: "Ambiente moderado", desc: "Produtos e avaliações passam por curadoria — sem spam nem concorrência desleal." },
  { icon: BarChart3, title: "Dashboard com métricas", desc: "Acompanhe visualizações, taxa de conversão de leads e desempenho por produto." },
  { icon: Star, title: "Avaliações reais", desc: "Construa reputação com reviews de clientes verificados que compraram de você." },
];

const STEPS = [
  { n: 1, title: "Crie sua conta", desc: "Cadastro gratuito em menos de 2 minutos, sem cartão de crédito." },
  { n: 2, title: "Preencha o perfil da empresa", desc: "Adicione logotipo, cidade, especialidades e certificações." },
  { n: 3, title: "Publique seus produtos", desc: "Fotos, materiais, cores, MOQ e prazo. Nossa curadoria aprova em até 24h." },
  { n: 4, title: "Receba orçamentos e amostras", desc: "Compradores enviam pedidos pelo painel — responda direto pelo chat interno." },
];

const FAQS = [
  { q: "É gratuito para começar?", a: "Sim. O plano Free permite cadastrar sua empresa e publicar produtos sem mensalidade. Você só paga se quiser destaque com os planos Pro ou Premium." },
  { q: "Como recebo os pedidos?", a: "Todos os orçamentos chegam no seu painel de vendedor com notificação in-app e por e-mail. Você conversa direto com o comprador via chat interno." },
  { q: "Quanto tempo leva a aprovação?", a: "Novos produtos são analisados em até 24 horas úteis pela nossa curadoria para garantir qualidade e conformidade." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Planos Pro e Premium são mensais sem fidelidade — cancele pelo próprio painel a qualquer momento." },
  { q: "Vocês cobram comissão sobre vendas?", a: "Não. Você negocia direto com o comprador e fica com 100% da venda. Nossa receita vem apenas das assinaturas de destaque." },
  { q: "Como funciona o destaque Premium?", a: "Empresas Premium aparecem no topo das buscas, categorias e comparativos, com selo verificado e prioridade em novos leads." },
];

function SellPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Cadastro gratuito, sem cartão
                </div>
                <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Venda brindes personalizados para todo o Brasil
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Cadastre sua empresa no maior hub de brindes corporativos, receba orçamentos
                  qualificados de compradores B2B e feche mais negócios com um painel completo.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/auth" search={{ mode: "signup" } as never}>
                      Cadastrar minha empresa <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/planos">Ver planos</Link>
                  </Button>
                </div>
                <ul className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem comissão sobre vendas</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem fidelidade</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Aprovação em 24h</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Building2, k: "Empresas ativas", v: "+500" },
                  { icon: Package, k: "Produtos catalogados", v: "+10.000" },
                  { icon: MessageSquare, k: "Orçamentos/mês", v: "+3.000" },
                  { icon: Trophy, k: "Categorias", v: "40+" },
                ].map((s) => (
                  <Card key={s.k}>
                    <CardContent className="p-5">
                      <s.icon className="h-6 w-6 text-primary" />
                      <div className="mt-3 text-2xl font-bold">{s.v}</div>
                      <div className="text-xs text-muted-foreground">{s.k}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Por que vender no BrindesHub?</h2>
            <p className="mt-3 text-muted-foreground">
              Tudo o que você precisa para escalar suas vendas B2B em um só lugar.
            </p>
          </header>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <Card key={b.title}>
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{b.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Passo a passo */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <header className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
              <p className="mt-3 text-muted-foreground">
                Do cadastro ao primeiro orçamento em menos de uma semana.
              </p>
            </header>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-lg border bg-card p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Planos CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
            <CardContent className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                  <Rocket className="h-3.5 w-3.5" /> Acelere seu crescimento
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  Destaque-se com os planos Pro e Premium
                </h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Ganhe prioridade nas buscas, apareça no topo dos comparativos e receba mais leads
                  qualificados todos os meses.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/planos">Ver planos e preços</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contato">Falar com vendas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            <header className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
              <p className="mt-3 text-muted-foreground">
                Tudo o que você precisa saber para começar a vender.
              </p>
            </header>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-lg border bg-card p-5 open:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                    {f.q}
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Começar agora — é grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
