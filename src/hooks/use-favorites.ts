import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "brindeshub:favorites:v1";
const EVENT = "brindeshub:favorites-change";

function readAll(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeAll(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota exceeded ou modo privado — silencioso */
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(readAll());
    setHydrated(true);
    const sync = () => setIds(readAll());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = readAll();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    writeAll(next);
    setIds(next);
    return next.includes(id);
  }, []);

  return { ids, isFavorite, toggle, hydrated };
}
