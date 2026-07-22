import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const URL_CANONICAL = "https://brinde-gallery.lovable.app/faq";
const TITLE = "Perguntas Frequentes — BrindesHub";
const DESC =
  "Tudo o que você precisa saber para comprar brindes corporativos no BrindesHub ou cadastrar sua empresa fornecedora.";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "O BrindesHub vende brindes diretamente?",
    a: "Não. Somos um marketplace que conecta compradores a fornecedores de brindes corporativos. A negociação, orçamento e entrega são feitos diretamente com a empresa escolhida.",
  },
  {
    q: "É gratuito solicitar orçamento?",
    a: "Sim. Solicitar orçamentos é 100% gratuito para compradores. Basta encontrar o produto ou empresa e enviar sua mensagem pelo formulário de contato.",
  },
  {
    q: "Como funciona o cadastro para fornecedores?",
    a: "Empresas criam uma conta gratuita, cadastram informações e produtos, e passam por uma moderação inicial. Após aprovação, o catálogo é publicado e passa a receber contatos de compradores.",
  },
  {
    q: "Quanto tempo leva a aprovação da empresa?",
    a: "Nosso time analisa novos cadastros em até 2 dias úteis. Empresas com informações completas e documentação em ordem são aprovadas mais rápido.",
  },
  {
    q: "Meus dados de contato são compartilhados?",
    a: "Ao enviar um formulário de orçamento, seus dados (nome, e-mail, telefone e mensagem) são compartilhados exclusivamente com a empresa destinatária. Não vendemos nem compartilhamos com terceiros. Detalhes na nossa Política de Privacidade.",
  },
  {
    q: "Posso alterar ou excluir meus dados?",
    a: "Sim. Você pode solicitar acesso, correção, portabilidade ou exclusão de dados a qualquer momento, conforme a LGPD, escrevendo para privacidade@brindeshub.com.br.",
  },
  {
    q: "Como o BrindesHub protege meus dados?",
    a: "Utilizamos criptografia em trânsito (HTTPS), Row-Level Security no banco, checagem de senhas vazadas (HIBP), rate-limiting em formulários e monitoramento contínuo de eventos de segurança.",
  },
  {
    q: "Recebi mensagem suspeita em nome do BrindesHub. O que faço?",
    a: "Encaminhe o e-mail para privacidade@brindeshub.com.br. Nunca solicitamos senha, dados bancários ou pagamentos diretos por e-mail ou WhatsApp.",
  },
];

export const Route = createFileRoute("/faq")({
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
          "@type": "FAQPage",
          mainEntity: FAQ.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Ajuda</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Perguntas Frequentes</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Não encontrou o que procurava?{" "}
          <Link to="/contato" className="font-medium text-primary underline">
            Fale com a gente
          </Link>
          .
        </p>
      </header>

      <ul className="mt-10 divide-y rounded-lg border bg-card">
        {FAQ.map((item, idx) => {
          const isOpen = open === idx;
          const panelId = `faq-panel-${idx}`;
          const btnId = `faq-btn-${idx}`;
          return (
            <li key={item.q}>
              <h2>
                <button
                  id={btnId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              </h2>
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                hidden={!isOpen}
                className="px-5 pb-5 text-sm text-muted-foreground"
              >
                {item.a}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
