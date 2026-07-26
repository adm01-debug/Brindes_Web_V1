import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "brindeshub-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolve(t: Theme): Resolved {
  if (t === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return t;
}

function apply(r: Resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", r === "dark");
  root.style.colorScheme = r;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    const r = resolve(stored);
    setResolved(r);
    apply(r);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const r: Resolved = mq.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    const r = resolve(t);
    setResolved(r);
    apply(r);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

/**
 * Fallback usado quando o contexto não está disponível (ex.: durante o SSR,
 * onde o módulo do provider pode ser instanciado em outro chunk). Lançar erro
 * aqui derrubava toda a árvore no servidor e forçava client-rendering da
 * página inteira — o que zerava o HTML indexável. Degradar para tema claro é
 * seguro: o tema real é aplicado no cliente pelo ThemeProvider.
 */
const SSR_THEME_FALLBACK: ThemeContextValue = {
  theme: "system",
  resolved: "light",
  setTheme: () => {},
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx ?? SSR_THEME_FALLBACK;
}
