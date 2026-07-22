import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://brinde-gallery.lovable.app/termos";
const TITLE = "Termos de Uso — BrindesHub";
const DESC =
  "Termos de Uso do BrindesHub: regras para uso do marketplace, direitos e responsabilidades de usuários, fornecedores e visitantes.";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 22 de julho de 2026
        </p>
      </header>

      <article className="prose prose-neutral mt-8 max-w-none space-y-6 text-foreground dark:prose-invert">
        <section>
          <h2 className="text-xl font-semibold">1. Aceitação</h2>
          <p className="text-muted-foreground">
            Ao acessar o BrindesHub você concorda com estes Termos de Uso e com nossa{" "}
            <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
            Se não concordar, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. O serviço</h2>
          <p className="text-muted-foreground">
            O BrindesHub é um marketplace que conecta empresas compradoras a fornecedores de brindes corporativos.
            Não somos parte das transações comerciais realizadas entre usuários e fornecedores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Cadastro e conta</h2>
          <p className="text-muted-foreground">
            Fornecedores devem cadastrar informações verdadeiras e manter seus dados atualizados. O cadastro está
            sujeito à aprovação e moderação. Contas com dados falsos podem ser suspensas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Conteúdo publicado</h2>
          <p className="text-muted-foreground">
            Fornecedores são integralmente responsáveis pelas informações, imagens e preços publicados. É proibido
            conteúdo ilegal, ofensivo, enganoso ou que infrinja direitos de terceiros. O BrindesHub pode remover
            conteúdos a qualquer momento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Contatos e leads</h2>
          <p className="text-muted-foreground">
            Ao enviar um contato para um fornecedor, o usuário autoriza o compartilhamento dos dados informados
            com aquela empresa, para fins de atendimento comercial.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Propriedade intelectual</h2>
          <p className="text-muted-foreground">
            Marca, logotipos, layout e código-fonte do BrindesHub são de propriedade exclusiva de seus titulares.
            Uso não autorizado é proibido.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Limitação de responsabilidade</h2>
          <p className="text-muted-foreground">
            O BrindesHub não se responsabiliza por qualidade, entrega, pagamento ou disputas entre compradores e
            fornecedores. Recomendamos formalizar orçamentos e contratos diretamente com o fornecedor escolhido.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Alterações</h2>
          <p className="text-muted-foreground">
            Podemos atualizar estes Termos a qualquer momento. A versão vigente é sempre a publicada nesta página.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Contato</h2>
          <p className="text-muted-foreground">
            Dúvidas sobre estes Termos:{" "}
            <a href="mailto:contato@brindeshub.com.br" className="text-primary underline">
              contato@brindeshub.com.br
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
