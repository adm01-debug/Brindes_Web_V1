import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { pgErrorMessage } from "@/lib/pg-errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Activity, RefreshCw, ShieldAlert, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/painel/admin/observabilidade")({
  component: ObservabilidadePage,
  head: () => ({
    meta: [{ title: "Observabilidade — Admin — BrindesHub" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

type SlowQuery = {
  queryid: number;
  calls: number;
  rows: number;
  total_exec_time: number;
  mean_exec_time: number;
  max_exec_time: number;
  query: string;
};

type SecurityEvent = {
  id: string;
  event_type: string;
  subject: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CronHealth = {
  jobname: string;
  schedule: string;
  last_run_start: string | null;
  last_run_end: string | null;
  last_status: string | null;
  duration_ms: number | null;
  last_error: string | null;
  runs_24h: number;
  failures_24h: number;
};

function ObservabilidadePage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (adminLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/painel" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Observabilidade</h1>
        <p className="text-sm text-muted-foreground">
          Monitor de queries lentas e eventos de segurança em tempo real.
        </p>
      </header>

      <Tabs defaultValue="queries">
        <TabsList>
          <TabsTrigger value="queries">
            <Activity className="mr-2 h-4 w-4" /> Queries lentas
          </TabsTrigger>
          <TabsTrigger value="cron">
            <Clock className="mr-2 h-4 w-4" /> Tarefas agendadas
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldAlert className="mr-2 h-4 w-4" /> Eventos de segurança
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queries" className="mt-4">
          <SlowQueriesPanel />
        </TabsContent>
        <TabsContent value="cron" className="mt-4">
          <CronHealthPanel />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityEventsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SlowQueriesPanel() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["slow-queries"],
    queryFn: async (): Promise<SlowQuery[]> => {
      const { data, error } = await supabase.rpc("get_slow_queries", { _limit: 50 });
      if (error) throw error;
      return (data ?? []) as SlowQuery[];
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_query_stats");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estatísticas de queries resetadas.");
      qc.invalidateQueries({ queryKey: ["slow-queries"] });
    },
    onError: (e) => toast.error(pgErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Top 50 queries por tempo total de execução</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Resetar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar estatísticas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso zera todas as métricas de <code>pg_stat_statements</code>. A ação não pode ser desfeita, mas
                  novas estatísticas começam a ser coletadas imediatamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetMutation.mutate()}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 animate-pulse rounded bg-muted" />}
        {error && <p className="text-sm text-destructive">{pgErrorMessage(error)}</p>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem queries lentas registradas.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Calls</TableHead>
                  <TableHead className="w-24">Média (ms)</TableHead>
                  <TableHead className="w-24">Total (ms)</TableHead>
                  <TableHead className="w-20">Rows</TableHead>
                  <TableHead>Query</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((q) => (
                  <TableRow key={q.queryid}>
                    <TableCell className="tabular-nums">{q.calls}</TableCell>
                    <TableCell className="tabular-nums">{q.mean_exec_time.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">{q.total_exec_time.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">{q.rows}</TableCell>
                    <TableCell>
                      <code
                        className="line-clamp-2 block max-w-2xl break-all text-xs text-muted-foreground"
                        title={q.query}
                      >
                        {q.query}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityEventsPanel() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [limit, setLimit] = useState(200);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["security-events", fromDate, toDate, limit],
    queryFn: async (): Promise<SecurityEvent[]> => {
      const { data, error } = await supabase.rpc("get_security_events", {
        _from: new Date(fromDate + "T00:00:00Z").toISOString(),
        _to: new Date(toDate + "T23:59:59Z").toISOString(),
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as SecurityEvent[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eventos de segurança</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="sec-from">De</Label>
            <Input id="sec-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-to">Até</Label>
            <Input id="sec-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sec-limit">Limite</Label>
            <Input
              id="sec-limit"
              type="number"
              min={10}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 200)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="w-full">
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Aplicar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 animate-pulse rounded bg-muted" />}
        {error && <p className="text-sm text-destructive">{pgErrorMessage(error)}</p>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento no período.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Quando</TableHead>
                  <TableHead className="w-48">Evento</TableHead>
                  <TableHead>Sujeito</TableHead>
                  <TableHead>Metadados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ev.created_at), { locale: ptBR, addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ev.event_type.includes("rate_limit") ? "destructive" : "secondary"}>
                        {ev.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{ev.subject ?? "—"}</TableCell>
                    <TableCell>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          ver
                        </summary>
                        <pre className="mt-1 max-w-lg overflow-x-auto rounded bg-muted p-2 text-[10px]">
                          {JSON.stringify(ev.metadata ?? {}, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
