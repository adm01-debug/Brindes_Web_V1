import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, Package, Inbox, ExternalLink, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/painel/leads")({
  component: LeadsPage,
});

type LeadStatus = "new" | "contacted" | "won" | "lost";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  quantity: number | null;
  message: string;
  status: LeadStatus;
  read_at: string | null;
  created_at: string;
  product_id: string | null;
  product: { id: string; name: string; slug: string } | null;
};

const STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-primary/10 text-primary border-primary/20" },
  contacted: { label: "Em contato", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  won: { label: "Ganho", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  lost: { label: "Perdido", className: "bg-muted text-muted-foreground border-border" },
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("id, name, email, phone, quantity, message, status, read_at, created_at, product_id, product:products(id, name, slug)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<LeadRow, "status" | "read_at">> }) => {
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const counts = useMemo(() => {
    const c = { total: data?.length ?? 0, new: 0, contacted: 0, won: 0, lost: 0 };
    data?.forEach((l) => {
      c[l.status] += 1;
    });
    return c;
  }, [data]);

  function exportCsv() {
    if (!data || data.length === 0) {
      toast.error("Nada para exportar");
      return;
    }
    const header = ["Data", "Nome", "Email", "Telefone", "Qtd", "Produto", "Status", "Mensagem"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = data.map((l) =>
      [
        new Date(l.created_at).toISOString(),
        l.name,
        l.email,
        l.phone ?? "",
        l.quantity ?? "",
        l.product?.name ?? "",
        STATUS_META[l.status].label,
        l.message.replace(/\s+/g, " ").trim(),
      ].map(escape).join(","),
    );
    // BOM for Excel UTF-8 compatibility
    const csv = "\ufeff" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} leads exportados`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos de orçamento</h1>
          <p className="text-sm text-muted-foreground">
            Leads enviados pelos visitantes através do catálogo público.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.length}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({counts.total})</SelectItem>
              <SelectItem value="new">Novos ({counts.new})</SelectItem>
              <SelectItem value="contacted">Em contato ({counts.contacted})</SelectItem>
              <SelectItem value="won">Ganhos ({counts.won})</SelectItem>
              <SelectItem value="lost">Perdidos ({counts.lost})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>


      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && (!data || data.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <h2 className="font-semibold">Nenhum pedido por aqui ainda</h2>
            <p className="text-sm text-muted-foreground">
              Assim que um visitante enviar um pedido de orçamento pelos seus produtos, ele aparece aqui.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {data?.map((lead) => {
          const meta = STATUS_META[lead.status];
          const isUnread = !lead.read_at;
          return (
            <Card key={lead.id} className={isUnread ? "border-primary/40 shadow-sm" : ""}>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{lead.name}</h3>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                      {isUnread && <Badge variant="secondary">Não lido</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Select
                    value={lead.status}
                    onValueChange={(v) =>
                      mutation.mutate({ id: lead.id, patch: { status: v as LeadStatus, read_at: lead.read_at ?? new Date().toISOString() } })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="contacted">Em contato</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                    <Mail className="h-3.5 w-3.5" /> {lead.email}
                  </a>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {lead.phone}
                    </a>
                  )}
                  {lead.quantity && (
                    <span className="text-muted-foreground">Qtd. estimada: <strong className="text-foreground">{lead.quantity}</strong></span>
                  )}
                </div>

                {lead.product && (
                  <Link
                    to="/produto/$id"
                    params={{ id: lead.product.id }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Sobre: {lead.product.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}

                <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">{lead.message}</p>

                {isUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mutation.mutate({ id: lead.id, patch: { read_at: new Date().toISOString() } })}
                  >
                    Marcar como lido
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
