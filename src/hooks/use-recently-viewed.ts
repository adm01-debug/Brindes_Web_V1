import { useCallback, useEffect, useState } from "react";

const KEY = "bh:recently_viewed:v1";
const MAX = 12;
const EVENT = "bh:recently_viewed:change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const track = useCallback((id: string) => {
    if (!id) return;
    const current = read().filter((v) => v !== id);
    current.unshift(id);
    write(current.slice(0, MAX));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { ids, track, clear };
}
