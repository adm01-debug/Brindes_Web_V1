import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useIsAdmin() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
    staleTime: 60_000,
  });
}
