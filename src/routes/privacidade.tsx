import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://brinde-gallery.lovable.app/privacidade";
const TITLE = "Política de Privacidade — BrindesHub";
const DESC =
  "Como o BrindesHub coleta, usa, compartilha e protege seus dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).";

export const Route = createFileRoute("/privacidade")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Legal · LGPD</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: 22 de julho de 2026
        </p>
      </header>

      <article className="prose prose-neutral mt-8 max-w-none space-y-6 text-foreground dark:prose-invert">
        <section>
          <h2 className="text-xl font-semibold">1. Quem somos</h2>
          <p className="text-muted-foreground">
            O BrindesHub é o controlador dos dados pessoais tratados nesta plataforma, nos termos da Lei Geral de
            Proteção de Dados (LGPD, Lei 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Dados que coletamos</h2>
          <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
            <li><strong>Cadastro de fornecedores:</strong> nome da empresa, e-mail, telefone, endereço, CNPJ.</li>
            <li><strong>Contatos (leads):</strong> nome, e-mail, telefone e mensagem enviada ao fornecedor.</li>
            <li><strong>Uso do site:</strong> páginas visitadas, produtos consultados, dados técnicos (IP anonimizado, dispositivo).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Como usamos</h2>
          <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
            <li>Operar e melhorar a plataforma.</li>
            <li>Encaminhar contatos ao fornecedor escolhido pelo usuário.</li>
            <li>Prevenir fraudes, spam e abusos (rate-limiting, moderação).</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Compartilhamento</h2>
          <p className="text-muted-foreground">
            Dados de contato enviados por formulários são compartilhados exclusivamente com o fornecedor
            destinatário. Utilizamos provedores de infraestrutura (hospedagem, banco de dados, e-mail) que atuam
            como operadores, sob acordos de confidencialidade.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Bases legais</h2>
          <p className="text-muted-foreground">
            Tratamos dados com base em: execução de contrato, cumprimento de obrigação legal, legítimo interesse
            (segurança e melhoria do serviço) e consentimento, quando aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Retenção</h2>
          <p className="text-muted-foreground">
            Mantemos dados de cadastro enquanto a conta estiver ativa. Leads são retidos por até 24 meses.
            Logs técnicos e de segurança por até 180 dias.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Seus direitos (LGPD)</h2>
          <p className="text-muted-foreground">
            Você pode solicitar acesso, correção, portabilidade, anonimização, eliminação de dados e revogação de
            consentimento enviando e-mail para{" "}
            <a href="mailto:privacidade@brindeshub.com.br" className="text-primary underline">
              privacidade@brindeshub.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Segurança</h2>
          <p className="text-muted-foreground">
            Adotamos medidas técnicas e organizacionais como RLS no banco, criptografia em trânsito (HTTPS),
            checagem de senhas vazadas (HIBP), rate-limiting e monitoramento de eventos de segurança.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Cookies</h2>
          <p className="text-muted-foreground">
            Utilizamos cookies estritamente necessários para autenticação e preferências (ex.: tema claro/escuro).
            Não utilizamos cookies de rastreamento publicitário.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Alterações</h2>
          <p className="text-muted-foreground">
            Esta política pode ser atualizada. Consulte esta página periodicamente ou veja também nossos{" "}
            <Link to="/termos" className="text-primary underline">Termos de Uso</Link>.
          </p>
        </section>
      </article>
    </main>
  );
}
