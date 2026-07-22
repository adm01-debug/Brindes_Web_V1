import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const SITE_URL = "https://brinde-gallery.lovable.app";

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const all: BreadcrumbItem[] = [{ label: "Início", href: "/" }, ...items];

  return (
    <nav aria-label="Navegação estrutural" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {all.map((item, i) => {
          const isLast = i === all.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center gap-1.5">
                {i === 0 && <Home className="h-3.5 w-3.5" aria-hidden />}
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={isLast ? "font-medium text-foreground" : ""}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.href} className="transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Gera o JSON-LD BreadcrumbList para uso em `head().scripts`. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  const all = [{ label: "Início", href: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `${SITE_URL}${it.href}` } : {}),
    })),
  };
}
