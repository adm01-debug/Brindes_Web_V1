import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pgErrorMessage } from "@/lib/pg-errors";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Note = {
  id: string;
  body: string;
  author_user_id: string;
  created_at: string;
};

export function LeadNotes({ leadId, currentUserId }: { leadId: string; currentUserId: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["lead-notes", leadId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_notes")
        .select("id, body, author_user_id, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (body: string) => {
      if (!currentUserId) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("lead_notes")
        .insert({ lead_id: leadId, author_user_id: currentUserId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
      toast.success("Nota adicionada");
    },
    onError: (e) => toast.error(pgErrorMessage(e)),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-notes", leadId] });
    },
    onError: (e) => toast.error(pgErrorMessage(e)),
  });

  return (
    <div className="border-t pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2 text-muted-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        {open ? "Ocultar notas internas" : `Notas internas${notes.length ? ` (${notes.length})` : ""}`}
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Registre um follow-up, retorno do cliente, próximos passos..."
              rows={2}
              maxLength={4000}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{draft.length}/4000</span>
              <Button
                size="sm"
                disabled={!draft.trim() || addNote.isPending}
                onClick={() => addNote.mutate(draft.trim())}
              >
                {addNote.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Adicionar nota
              </Button>
            </div>
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">Carregando notas…</p>}

          {!isLoading && notes.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma nota ainda. Registre o histórico de contato para acompanhar este lead.</p>
          )}

          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-line text-sm">{n.body}</p>
                  {n.author_user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNote.mutate(n.id)}
                      aria-label="Excluir nota"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
