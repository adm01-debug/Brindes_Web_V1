import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ARTICLES, findArticle, type Article, type ArticleSection } from "@/lib/articles";
import { INTENTS, type Intent } from "@/lib/intents";
import { Clock, Calendar } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = findArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ params, loaderData }) => {
    const article = loaderData?.article ?? findArticle(params.slug);
    const url = `${SITE_URL}/blog/${params.slug}`;
    if (!article) {
      return { meta: [{ title: "Artigo não encontrado | BrindesHub" }] };
    }
    return {
      meta: [
        { title: article.title },
        { name: "description", content: article.description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.description },
        { property: "og:url", content: url },
        { property: "article:published_time", content: article.publishedAt },
        { property: "article:modified_time", content: article.updatedAt },
        { property: "article:author", content: article.author },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: article.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.h1,
            description: article.description,
            author: { "@type": "Organization", name: article.author },
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            publisher: {
              "@type": "Organization",
              name: "BrindesHub",
              url: SITE_URL,
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: article.h1, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-destructive">Erro: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Veja outros artigos disponíveis.</p>
        <Button asChild className="mt-6"><Link to="/blog">Voltar ao blog</Link></Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function ArticlePage() {
  const data = Route.useLoaderData() as { article: Article };
  const article = data.article;
  const related: Article[] = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);
  const relatedIntents: Intent[] = (article.related ?? [])
    .map((s: string) => INTENTS.find((i) => i.slug === s))
    .filter((x): x is Intent => !!x);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Breadcrumbs
            className="mb-4"
            items={[{ label: "Blog", href: "/blog" }, { label: article.h1 }]}
          />
          <div className="flex flex-wrap gap-2">
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{article.h1}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(article.publishedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.readingMinutes} min de leitura
            </span>
            <span>por {article.author}</span>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{article.intro}</p>

          <div className="mt-8 space-y-8">
            {article.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-foreground/90">
                  {s.body.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-xl font-semibold">Perguntas frequentes</h2>
            <div className="mt-4 space-y-3">
              {article.faqs.map((f) => (
                <details key={f.q} className="rounded-lg border bg-card p-4">
                  <summary className="cursor-pointer font-medium">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {relatedIntents.length > 0 && (
            <section className="mt-10 rounded-lg border bg-card p-6">
              <h3 className="font-semibold">Guias relacionados</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {relatedIntents.map((i) => (
                  <li key={i.slug}>
                    <Link
                      to="/ideias/$slug"
                      params={{ slug: i.slug }}
                      className="text-sm text-primary hover:underline"
                    >
                      {i.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h3 className="font-semibold">Outros artigos</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: a.slug }}
                    className="text-sm text-primary hover:underline"
                  >
                    {a.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
