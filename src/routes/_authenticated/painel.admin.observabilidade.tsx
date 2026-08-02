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
import { Activity, RefreshCw, ShieldAlert, Trash2, Clock, Gauge, AlertTriangle } from "lucide-react";
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

type CronProblem = {
  jobname: string;
  schedule: string;
  problem: string;
  detail: string;
  last_run: string | null;
};

const PROBLEM_LABEL: Record<string, string> = {
  failed: "Falhou",
  stalled: "Parada",
  never_ran: "Nunca executou",
};

/**
 * Alertas ativos do watchdog de pg_cron. Compartilhado entre o banner de topo
 * e o painel da aba, para que ambos leiam exatamente o mesmo estado.
 */
function useCronProblems() {
  return useQuery({
    queryKey: ["cron-problems"],
    queryFn: async (): Promise<CronProblem[]> => {
      const { data, error } = await supabase.rpc("get_cron_problems");
      if (error) throw error;
      return (data ?? []) as CronProblem[];
    },
    refetchInterval: 60_000,
  });
}

function CronProblemsBanner({ problems }: { problems: CronProblem[] }) {
  if (problems.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-destructive">
            {problems.length === 1
              ? "1 tarefa agendada precisa de atenção"
              : `${problems.length} tarefas agendadas precisam de atenção`}
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {problems.slice(0, 5).map((p) => (
              <li key={p.jobname} className="truncate" title={p.detail}>
                <span className="font-medium text-foreground">{p.jobname}</span>{" "}
                — {PROBLEM_LABEL[p.problem] ?? p.problem}: {p.detail}
              </li>
            ))}
            {problems.length > 5 && <li>e mais {problems.length - 5}…</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ObservabilidadePage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: problems } = useCronProblems();
  const problemList = problems ?? [];

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

      <CronProblemsBanner problems={problemList} />

      <Tabs defaultValue={problemList.length > 0 ? "cron" : "queries"}>
        <TabsList>
          <TabsTrigger value="queries">
            <Activity className="mr-2 h-4 w-4" /> Queries lentas
          </TabsTrigger>
          <TabsTrigger value="webvitals">
            <Gauge className="mr-2 h-4 w-4" /> Web Vitals
          </TabsTrigger>
          <TabsTrigger value="cron">
            <Clock className="mr-2 h-4 w-4" /> Tarefas agendadas
            {problemList.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px]">
                {problemList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldAlert className="mr-2 h-4 w-4" /> Eventos de segurança
          </TabsTrigger>
        </TabsList>
        <TabsContent value="queries" className="mt-4">
          <SlowQueriesPanel />
        </TabsContent>
        <TabsContent value="webvitals" className="mt-4">
          <WebVitalsPanel />
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

function CronHealthPanel() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["cron-health"],
    queryFn: async (): Promise<CronHealth[]> => {
      const { data, error } = await supabase.rpc("get_cron_health", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as CronHealth[];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Saúde das tarefas agendadas (pg_cron)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 animate-pulse rounded bg-muted" />}
        {error && <p className="text-sm text-destructive">{pgErrorMessage(error)}</p>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa agendada.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead className="w-28">Agenda</TableHead>
                  <TableHead className="w-40">Última execução</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Duração</TableHead>
                  <TableHead className="w-28">24h (falhas)</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((j) => {
                  const ok = j.last_status === "succeeded" || j.last_status === null;
                  return (
                    <TableRow key={j.jobname}>
                      <TableCell className="font-medium text-xs">{j.jobname}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{j.schedule}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {j.last_run_start
                          ? formatDistanceToNow(new Date(j.last_run_start), { locale: ptBR, addSuffix: true })
                          : "nunca"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ok ? "secondary" : "destructive"}>
                          {j.last_status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {j.duration_ms != null ? `${j.duration_ms.toFixed(0)} ms` : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {j.runs_24h}
                        {j.failures_24h > 0 && (
                          <span className="ml-1 text-destructive">({j.failures_24h})</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-sm truncate text-xs text-destructive" title={j.last_error ?? ""}>
                        {j.last_error ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type WebVitalRow = {
  day: string;
  metric: string;
  route: string;
  samples: number;
  p75: number;
};

const METRIC_THRESHOLDS: Record<string, { good: number; poor: number; unit: string }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "" },
  FCP: { good: 1800, poor: 3000, unit: "ms" },
  TTFB: { good: 800, poor: 1800, unit: "ms" },
};

function ratingFor(metric: string, p75: number): "good" | "needs" | "poor" {
  const t = METRIC_THRESHOLDS[metric];
  if (!t) return "good";
  if (p75 <= t.good) return "good";
  if (p75 <= t.poor) return "needs";
  return "poor";
}

function formatP75(metric: string, v: number) {
  const t = METRIC_THRESHOLDS[metric];
  if (metric === "CLS") return v.toFixed(3);
  return `${Math.round(v)}${t?.unit ?? ""}`;
}

function WebVitalsPanel() {
  const [days, setDays] = useState(14);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["web-vitals-daily", days],
    queryFn: async (): Promise<WebVitalRow[]> => {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("web_vitals_daily")
        .select("day, metric, route, samples, p75")
        .gte("day", since)
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WebVitalRow[];
    },
  });

  // Agrega: por métrica, p75 mais recente (último dia) e média ponderada
  const summary = (() => {
    if (!data) return [] as { metric: string; p75_latest: number; samples: number }[];
    const byMetric = new Map<string, WebVitalRow[]>();
    for (const r of data) {
      const arr = byMetric.get(r.metric) ?? [];
      arr.push(r);
      byMetric.set(r.metric, arr);
    }
    return Array.from(byMetric.entries()).map(([metric, rows]) => {
      const totalSamples = rows.reduce((a, r) => a + r.samples, 0);
      const weighted = totalSamples > 0 ? rows.reduce((a, r) => a + r.p75 * r.samples, 0) / totalSamples : 0;
      return { metric, p75_latest: weighted, samples: totalSamples };
    });
  })();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Web Vitals (p75) — últimos {days} dias</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Coleta RUM via <code>navigator.sendBeacon</code>. Agregação diária p75 por rota e métrica.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && <div className="h-40 animate-pulse rounded bg-muted" />}
        {error && <p className="text-sm text-destructive">{pgErrorMessage(error)}</p>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há amostras. Aguarde tráfego real para popular as métricas.
          </p>
        )}

        {summary.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {summary.map((s) => {
              const rating = ratingFor(s.metric, s.p75_latest);
              const color =
                rating === "good"
                  ? "border-green-500/40 bg-green-500/5"
                  : rating === "needs"
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-destructive/40 bg-destructive/5";
              return (
                <div key={s.metric} className={`rounded-lg border p-3 ${color}`}>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.metric}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{formatP75(s.metric, s.p75_latest)}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{s.samples.toLocaleString("pt-BR")} amostras</div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Dia</TableHead>
                  <TableHead className="w-20">Métrica</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead className="w-24 text-right">Amostras</TableHead>
                  <TableHead className="w-28 text-right">p75</TableHead>
                  <TableHead className="w-24">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data]
                  .sort((a, b) => (a.day < b.day ? 1 : -1))
                  .slice(0, 200)
                  .map((r, i) => {
                    const rating = ratingFor(r.metric, r.p75);
                    return (
                      <TableRow key={`${r.day}-${r.metric}-${r.route}-${i}`}>
                        <TableCell className="text-xs tabular-nums">{r.day}</TableCell>
                        <TableCell className="text-xs font-medium">{r.metric}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.route}>
                          {r.route}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{r.samples}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatP75(r.metric, r.p75)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={rating === "good" ? "default" : rating === "needs" ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {rating === "good" ? "Bom" : rating === "needs" ? "A melhorar" : "Ruim"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
