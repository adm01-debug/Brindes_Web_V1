import { Link } from "@tanstack/react-router";
import { Package2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package2 className="h-4 w-4" />
              </div>
              <span>BrindesHub</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              O portal que conecta empresas de brindes a compradores corporativos em todo o Brasil.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Explorar</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/empresas" className="hover:text-foreground">Empresas</Link></li>
              <li><Link to="/buscar" className="hover:text-foreground">Produtos</Link></li>
              <li><Link to="/categorias" className="hover:text-foreground">Categorias</Link></li>
              <li><Link to="/kits" className="hover:text-foreground">Kits temáticos</Link></li>
              <li><Link to="/datas-comemorativas" className="hover:text-foreground">Datas comemorativas</Link></li>
              <li><Link to="/brindes-por-evento" className="hover:text-foreground">Brindes por evento</Link></li>
              <li><Link to="/brindes-por-publico-alvo" className="hover:text-foreground">Brindes por público-alvo</Link></li>
              <li><Link to="/brindes-por-data" className="hover:text-foreground">Brindes por data</Link></li>
              <li><Link to="/brindes-a-z" className="hover:text-foreground">Brindes de A a Z</Link></li>
              <li><Link to="/empresas-a-z" className="hover:text-foreground">Fornecedores de A a Z</Link></li>
              <li><Link to="/ofertas" className="hover:text-foreground">Ofertas e ponta de estoque</Link></li>
              <li><Link to="/inusitados" className="hover:text-foreground">Brindes inusitados</Link></li>


            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Para empresas</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/vender" className="hover:text-foreground">Vender no BrindesHub</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Cadastrar empresa</Link></li>

              <li><Link to="/planos" className="hover:text-foreground">Planos e destaques</Link></li>
              <li><Link to="/painel" className="hover:text-foreground">Painel</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Portal</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-foreground">Sobre</Link></li>
              <li><Link to="/como-funciona" className="hover:text-foreground">Como funciona</Link></li>
              <li><Link to="/faq" className="hover:text-foreground">Perguntas frequentes</Link></li>
              <li><Link to="/termos" className="hover:text-foreground">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground">Privacidade</Link></li>
              <li><Link to="/contato" className="hover:text-foreground">Contato</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BrindesHub. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
