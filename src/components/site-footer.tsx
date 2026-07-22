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
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Para empresas</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">Cadastrar empresa</Link></li>
              <li><Link to="/painel" className="hover:text-foreground">Painel</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Portal</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-foreground">Sobre</Link></li>
              <li><a href="mailto:contato@brindeshub.com.br" className="hover:text-foreground">Contato</a></li>
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
