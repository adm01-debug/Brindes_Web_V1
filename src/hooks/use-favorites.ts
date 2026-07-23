import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "brindeshub:favorites:v1";
const EVENT = "brindeshub:favorites-change";

function readLocal(): string[] {
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

function writeLocal(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota exceeded ou modo privado — silencioso */
  }
}

function clearLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchRemote(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId)
    .not("product_id", "is", null);
  if (error || !data) return [];
  return data.map((r) => r.product_id as string).filter(Boolean);
}

export function useFavorites() {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const migratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (!user) {
        setIds(readLocal());
        setHydrated(true);
        return;
      }
      // Autenticado: migra localStorage → remoto (uma vez por sessão de user)
      if (migratedFor.current !== user.id) {
        migratedFor.current = user.id;
        const local = readLocal();
        if (local.length > 0) {
          const rows = local.map((pid) => ({ user_id: user.id, product_id: pid }));
          await supabase.from("favorites").upsert(rows, { onConflict: "user_id,product_id", ignoreDuplicates: true });
          clearLocal();
        }
      }
      const remote = await fetchRemote(user.id);
      if (!cancelled) {
        setIds(remote);
        setHydrated(true);
        window.dispatchEvent(new CustomEvent(EVENT));
      }
    }
    load();

    const sync = () => {
      if (!user) setIds(readLocal());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user, authLoading]);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      const current = ids;
      const willAdd = !current.includes(id);
      const next = willAdd ? [...current, id] : current.filter((x) => x !== id);
      setIds(next); // otimista

      if (user) {
        if (willAdd) {
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, product_id: id });
          if (error && error.code !== "23505") {
            setIds(current); // rollback
            return current.includes(id);
          }
        } else {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", id);
          if (error) {
            setIds(current);
            return current.includes(id);
          }
        }
        window.dispatchEvent(new CustomEvent(EVENT));
      } else {
        writeLocal(next);
      }
      return willAdd;
    },
    [ids, user],
  );

  return { ids, isFavorite, toggle, hydrated };
}
