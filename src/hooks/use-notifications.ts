import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NotificationKind = "lead" | "question" | "answer" | "review" | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = useMemo(() => ["notifications", user?.id ?? "anon"], [user?.id]);

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc, key]);

  const unreadCount = (query.data ?? []).filter((n) => !n.read_at).length;

  const markRead = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) qc.invalidateQueries({ queryKey: key });
    },
    [qc, key],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (!error) qc.invalidateQueries({ queryKey: key });
  }, [qc, key, user]);

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (!error) qc.invalidateQueries({ queryKey: key });
    },
    [qc, key],
  );

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markRead,
    markAllRead,
    remove,
  };
}
