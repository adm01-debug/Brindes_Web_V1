import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { useServerFn } from "@tanstack/react-start";
import { 
  getQuoteCart as getQuoteCartFn, 
  syncQuoteCart as syncQuoteCartFn,
  removeFromQuoteCart as removeFromQuoteCartFn,
  clearQuoteCart as clearQuoteCartFn
} from "@/lib/quote-cart.functions";
import { reportLovableError } from "@/lib/lovable-error-reporting";

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

function readLocal(): QuoteCartItem[] {
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

function writeLocal(items: QuoteCartItem[]): void {
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
  const { user } = useAuth();
  
  const getQuoteCart = useServerFn(getQuoteCartFn);
  const syncQuoteCart = useServerFn(syncQuoteCartFn);
  const removeFromQuoteCart = useServerFn(removeFromQuoteCartFn);
  const clearQuoteCart = useServerFn(clearQuoteCartFn);

  // Inicialização e Sincronização
  useEffect(() => {
    const init = async () => {
      let localItems = readLocal();
      
      if (user) {
        try {
          const remoteItems = await getQuoteCart();
          // Merge simplificado: itens locais que não estão no remoto são enviados
          const remoteIds = new Set(remoteItems.map(i => i.product_id));
          const localOnly = localItems.filter(i => !remoteIds.has(i.product_id));
          
          if (localOnly.length > 0) {
            await syncQuoteCart(localOnly.map(i => ({
              product_id: i.product_id,
              quantity: i.quantity,
              notes: i.notes
            })));
            // Recarrega após merge
            const updatedRemote = await getQuoteCart();
            // Precisamos dos metadados locais (nome, empresa, imagem) que não estão na tabela sync
            localItems = localItems.map(li => {
              const ri = updatedRemote.find(r => r.product_id === li.product_id);
              return ri ? { ...li, quantity: ri.quantity, notes: ri.notes } : li;
            });
          }
        } catch (err) {
          reportLovableError(err, { context: "quote_cart_sync_init" });
        }
      }
      
      setItems(localItems);
      setHydrated(true);
    };

    init();

    const sync = () => setItems(readLocal());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user]);

  const has = useCallback((productId: string) => items.some((i) => i.product_id === productId), [items]);

  const add = useCallback(async (item: Omit<QuoteCartItem, "added_at">) => {
    const current = readLocal();
    if (current.some((i) => i.product_id === item.product_id)) return current;
    if (current.length >= MAX_ITEMS) return current;
    
    const next = [...current, { ...item, added_at: Date.now() }];
    writeLocal(next);
    setItems(next);

    if (user) {
      try {
        await syncQuoteCart([{
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }]);
      } catch (err) {
        reportLovableError(err, { context: "quote_cart_add_sync" });
      }
    }
    return next;
  }, [user, syncQuoteCart]);

  const remove = useCallback(async (productId: string) => {
    const next = readLocal().filter((i) => i.product_id !== productId);
    writeLocal(next);
    setItems(next);

    if (user) {
      try {
        await removeFromQuoteCart({ product_id: productId });
      } catch (err) {
        reportLovableError(err, { context: "quote_cart_remove_sync" });
      }
    }
    return next;
  }, [user, removeFromQuoteCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number | null) => {
    const next = readLocal().map((i) => (i.product_id === productId ? { ...i, quantity } : i));
    writeLocal(next);
    setItems(next);

    if (user) {
      try {
        await syncQuoteCart([{
          product_id: productId,
          quantity,
          notes: next.find(i => i.product_id === productId)?.notes || null
        }]);
      } catch (err) {
        reportLovableError(err, { context: "quote_cart_qty_sync" });
      }
    }
    return next;
  }, [user, syncQuoteCart]);

  const updateNotes = useCallback(async (productId: string, notes: string | null) => {
    const clean = notes && notes.trim().length > 0 ? notes.trim().slice(0, 500) : null;
    const next = readLocal().map((i) => (i.product_id === productId ? { ...i, notes: clean } : i));
    writeLocal(next);
    setItems(next);

    if (user) {
      try {
        await syncQuoteCart([{
          product_id: productId,
          quantity: next.find(i => i.product_id === productId)?.quantity || null,
          notes: clean
        }]);
      } catch (err) {
        reportLovableError(err, { context: "quote_cart_notes_sync" });
      }
    }
    return next;
  }, [user, syncQuoteCart]);

  const clear = useCallback(async () => {
    writeLocal([]);
    setItems([]);

    if (user) {
      try {
        await clearQuoteCart();
      } catch (err) {
        reportLovableError(err, { context: "quote_cart_clear_sync" });
      }
    }
  }, [user, clearQuoteCart]);

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