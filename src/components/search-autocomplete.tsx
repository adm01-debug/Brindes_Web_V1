import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, Building2, Tags, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Suggestion {
  kind: string;
  label: string;
  slug: string;
  extra: string | null;
}

export interface SearchAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Disparado ao confirmar um termo livre (Enter sem sugestão selecionada). */
  onSubmitTerm?: (term: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

const KIND_ICON: Record<string, typeof Package> = {
  product: Package,
  company: Building2,
  category: Tags,
};

const KIND_LABEL: Record<string, string> = {
  product: "Produto",
  company: "Empresa",
  category: "Categoria",
};

/**
 * Campo de busca com sugestões (categorias, empresas e produtos aprovados).
 * As sugestões vêm da RPC `suggest_search_terms`, que já filtra moderação.
 */
export function SearchAutocomplete({
  value,
  onValueChange,
  onSubmitTerm,
  placeholder = "Buscar por nome, cor, material...",
  className,
  inputClassName,
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(id);
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const enabled = debounced.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["search-suggestions", debounced],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Suggestion[]> => {
      const { data, error } = await supabase.rpc("suggest_search_terms", {
        _q: debounced,
        _limit: 8,
      });
      if (error) return [];
      return (data ?? []) as Suggestion[];
    },
  });

  const suggestions = useMemo(() => data ?? [], [data]);

  const go = (s: Suggestion) => {
    setOpen(false);
    if (s.kind === "product") navigate({ to: "/produto/$id", params: { id: s.slug } });
    else if (s.kind === "company") navigate({ to: "/empresa/$slug", params: { slug: s.slug } });
    else navigate({ to: "/categoria/$slug", params: { slug: s.slug } });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      go(suggestions[highlight]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        placeholder={placeholder}
        className={cn("pl-9", inputClassName)}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setHighlight(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Termo de busca"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        role="combobox"
        autoComplete="off"
      />
      {isFetching && enabled && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
      )}

      {open && enabled && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((s, i) => {
            const Icon = KIND_ICON[s.kind] ?? Package;
            return (
              <li key={`${s.kind}-${s.slug}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(s)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm",
                    i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {s.extra ? `${KIND_LABEL[s.kind] ?? ""} · ${s.extra}` : KIND_LABEL[s.kind]}
                  </span>
                </button>
              </li>
            );
          })}
          {onSubmitTerm && (
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSubmitTerm(value.trim());
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar por &quot;{value.trim()}&quot;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
