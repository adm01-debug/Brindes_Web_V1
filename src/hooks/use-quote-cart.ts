import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "brindeshub:quote-cart:v1";
const EVENT = "brindeshub:quote-cart-change";
const MAX_ITEMS = 50;

export type QuoteCartItem = {
  product_id: string;
  product_name: string;
  company_id: string;
  company_name: string | null;
  image_url: string | null;
  quantity: number | null;
  notes: string | null;
  added_at: number;
};

function readAll(): QuoteCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is QuoteCartItem =>
          !!x && typeof x.product_id === "string" && typeof x.product_name === "string" && typeof x.company_id === "string",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeAll(items: QuoteCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota / modo privado — silencioso */
  }
}

export function useQuoteCart() {
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readAll());
    setHydrated(true);
    const sync = () => setItems(readAll());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = useCallback((productId: string) => items.some((i) => i.product_id === productId), [items]);

  const add = useCallback((item: Omit<QuoteCartItem, "added_at">) => {
    const current = readAll();
    if (current.some((i) => i.product_id === item.product_id)) return current;
    if (current.length >= MAX_ITEMS) return current;
    const next = [...current, { ...item, added_at: Date.now() }];
    writeAll(next);
    setItems(next);
    return next;
  }, []);

  const remove = useCallback((productId: string) => {
    const next = readAll().filter((i) => i.product_id !== productId);
    writeAll(next);
    setItems(next);
    return next;
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number | null) => {
    const next = readAll().map((i) => (i.product_id === productId ? { ...i, quantity } : i));
    writeAll(next);
    setItems(next);
    return next;
  }, []);

  const updateNotes = useCallback((productId: string, notes: string | null) => {
    const clean = notes && notes.trim().length > 0 ? notes.trim().slice(0, 500) : null;
    const next = readAll().map((i) => (i.product_id === productId ? { ...i, notes: clean } : i));
    writeAll(next);
    setItems(next);
    return next;
  }, []);

  const clear = useCallback(() => {
    writeAll([]);
    setItems([]);
  }, []);

  return {
    items,
    hydrated,
    count: items.length,
    has,
    add,
    remove,
    updateQuantity,
    updateNotes,
    clear,
    maxItems: MAX_ITEMS,
  };
}
