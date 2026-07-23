import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Lightbulb } from "lucide-react";
import { INTENTS } from "@/lib/intents";

const HUB_URL = "https://brinde-gallery.lovable.app/ideias";

export const Route = createFileRoute("/ideias/")({
  head: () => ({
    meta: [
      { title: "Ideias de brindes personalizados por ocasião | BrindesHub" },
      {
        name: "description",
        content:
          "Guias curados de brindes personalizados por ocasião: eventos, feiras, Natal, sustentáveis, tecnologia e mais.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Ideias de brindes personalizados por ocasião" },
      { property: "og:description", content: "Descubra o brinde ideal para cada objetivo de marca." },
      { property: "og:url", content: HUB_URL },
      { name: "twitter:title", content: "Ideias de brindes personalizados" },
      { name: "twitter:description", content: "Guias curados de brindes por ocasião e público." },
    ],
    links: [{ rel: "canonical", href: HUB_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Ideias de brindes personalizados",
          url: HUB_URL,
          hasPart: INTENTS.map((i) => ({
            "@type": "WebPage",
            name: i.h1,
            url: `${HUB_URL}/${i.slug}`,
          })),
        }),
      },
    ],
  }),
  component: IdeiasHub,
});

function IdeiasHub() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Ideias de brindes" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ideias de brindes por ocasião
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Guias curados para escolher o brinde certo para cada objetivo, público e época.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTENTS.map((i) => (
              <Link
                key={i.slug}
                to="/ideias/$slug"
                params={{ slug: i.slug }}
                className="group flex flex-col gap-2 rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <h2 className="font-semibold group-hover:text-primary">{i.h1}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">{i.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
