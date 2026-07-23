import { useCallback, useEffect, useState } from "react";

const KEY = "brindeshub:compare:v1";
const EVENT = "brindeshub:compare-change";
export const MAX_COMPARE = 4;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_COMPARE)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore */
  }
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isInCompare = useCallback((id: string) => ids.includes(id), [ids]);
  const isFull = ids.length >= MAX_COMPARE;

  const toggle = useCallback((id: string) => {
    const current = read();
    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      write(next);
      setIds(next);
      return { added: false, full: false };
    }
    if (current.length >= MAX_COMPARE) {
      return { added: false, full: true };
    }
    const next = [...current, id];
    write(next);
    setIds(next);
    return { added: true, full: false };
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((x) => x !== id);
    write(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setIds([]);
  }, []);

  return { ids, hydrated, isInCompare, isFull, count: ids.length, toggle, remove, clear };
}
