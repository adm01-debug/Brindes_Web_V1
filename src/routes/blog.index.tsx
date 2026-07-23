import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ARTICLES } from "@/lib/articles";
import { Clock, ArrowRight } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const url = `${SITE_URL}/blog`;
    const title = "Blog BrindesHub — guias e tendências de brindes corporativos";
    const description =
      "Artigos, guias e tendências sobre brindes corporativos, personalização, sustentabilidade e ideias por segmento.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Blog BrindesHub",
            url,
            blogPost: ARTICLES.map((a) => ({
              "@type": "BlogPosting",
              headline: a.title,
              url: `${SITE_URL}/blog/${a.slug}`,
              datePublished: a.publishedAt,
              dateModified: a.updatedAt,
              author: { "@type": "Organization", name: a.author },
            })),
          }),
        },
      ],
    };
  },
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Blog" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog BrindesHub</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Guias práticos, tendências e ideias para acertar em cheio nos seus brindes corporativos.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {ARTICLES.map((a) => (
              <article
                key={a.slug}
                className="group flex flex-col rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap gap-2">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-snug">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: a.slug }}
                    className="hover:text-primary"
                  >
                    {a.h1}
                  </Link>
                </h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readingMinutes} min de leitura
                  </span>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: a.slug }}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Ler artigo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
