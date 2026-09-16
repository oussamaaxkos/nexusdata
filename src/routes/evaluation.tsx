import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, Play } from "lucide-react";
import { AppShell } from "@/components/ops/app-shell";
import {
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  RiskBadge,
  StatusBadge,
  fmtDate,
  fmtNumber,
} from "@/components/ops/primitives";
import { runEvaluationBatch, startEvaluation } from "@/lib/ops/evaluation.functions";
import {
  evaluationCasesQuery,
  evaluationResultsQuery,
  evaluationRunsQuery,
} from "@/lib/ops/client-queries";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "AI Evaluation | OpsMind AI" },
      {
        name: "description",
        content:
          "Benchmark the agent on a golden dataset: intent accuracy, tool selection, retrieval recall, groundedness, latency and cost.",
      },
      { property: "og:title", content: "AI Evaluation | OpsMind AI" },
      { property: "og:description", content: "Measurable agent quality with per-case results and model comparison." },
    ],
  }),
  component: EvaluationPage,
});

function EvaluationPage() {
  const qc = useQueryClient();
  const runs = useQuery(evaluationRunsQuery);
  const cases = useQuery(evaluationCasesQuery);
  const [selected, setSelected] = useState<string | null>(null);
  const [caseLimit, setCaseLimit] = useState(6);
  const [label, setLabel] = useState("Regression benchmark");
  const [progress, setProgress] = useState<string | null>(null);

  const start = useServerFn(startEvaluation);
  const batch = useServerFn(runEvaluationBatch);

  const activeId = selected ?? runs.data?.[0]?.id ?? "";
  const results = useQuery({ ...evaluationResultsQuery(activeId), enabled: Boolean(activeId) });
  const active = runs.data?.find((r) => r.id === activeId);

  async function launch() {
    setProgress("Preparing benchmark…");
    try {
      const started: any = await start({ data: { label, caseLimit } });
      qc.invalidateQueries({ queryKey: ["evaluation_runs"] });
      setSelected(started.eval_run_id);
      let done = 0;
      while (done < started.total) {
        setProgress(`Running case ${Math.min(done + 1, started.total)} of ${started.total}…`);
        const res: any = await batch({ data: { evalRunId: started.eval_run_id, batchSize: 2 } });
        done += res?.processed ?? 0;
        qc.invalidateQueries({ queryKey: ["evaluation_results", started.eval_run_id] });
        qc.invalidateQueries({ queryKey: ["evaluation_runs"] });
        if (!res?.processed) break;
      }
      toast.success("Benchmark finished.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The benchmark failed.");
    } finally {
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["run_metrics"] });
    }
  }

  const byCategory = new Map<string, { total: number; passed: number }>();
  for (const r of results.data ?? []) {
    const cat = (r as any).evaluation_cases?.category ?? "other";
    const entry = byCategory.get(cat) ?? { total: 0, passed: 0 };
    entry.total += 1;
    if (r.passed) entry.passed += 1;
    byCategory.set(cat, entry);
  }
  const chartData = [...byCategory.entries()].map(([name, v]) => ({
    name,
    pass_rate: Math.round((v.passed / v.total) * 100),
  }));

  return (
    <AppShell>
      <PageHeader
        title="AI Evaluation"
        subtitle={`Golden dataset of ${cases.data?.length ?? 0} cases covering retrieval, reasoning, refusal, risk routing and tool selection.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={caseLimit}
              onChange={(e) => setCaseLimit(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {[4, 6, 8, 12, 16].map((n) => (
                <option key={n} value={n}>
                  {n} cases
                </option>
              ))}
            </select>
            <button
              onClick={launch}
              disabled={Boolean(progress)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run benchmark
            </button>
          </div>
        }
      />

      {progress ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{progress}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Panel title="Benchmark runs">
          {runs.data?.length ? (
            <ul className="space-y-1">
              {runs.data.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r.id)}
                    className={
                      r.id === activeId
                        ? "w-full rounded-md border border-primary/50 bg-accent px-3 py-2 text-left"
                        : "w-full rounded-md border border-transparent px-3 py-2 text-left hover:bg-accent/50"
                    }
                  >
                    <p className="text-xs font-medium">{r.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {r.model} · {r.prompt_version} · {r.case_count} cases
                    </p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(r.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No benchmarks yet" hint="Run one to measure agent quality." />
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title={active?.label ?? "Results"} description={active ? `${active.model} · prompt ${active.prompt_version}` : undefined}>
            {active ? (
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <Metric label="Pass rate" value={`${Number(active.task_success_rate ?? 0).toFixed(0)}%`} />
                <Metric label="Recall@5" value={`${Number(active.recall_at_5 ?? 0).toFixed(0)}%`} />
                <Metric label="Tool accuracy" value={`${Number(active.tool_accuracy ?? 0).toFixed(0)}%`} />
                <Metric label="Groundedness" value={`${Number(active.groundedness ?? 0).toFixed(0)}%`} />
                <Metric label="Avg latency" value={`${fmtNumber(active.avg_latency_ms)} ms`} />
                <Metric label="Total cost" value={`$${Number(active.estimated_cost ?? 0).toFixed(4)}`} />
              </div>
            ) : (
              <EmptyState title="Select a benchmark" />
            )}
          </Panel>

          {chartData.length ? (
            <Panel title="Pass rate by category">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                    />
                    <Bar dataKey="pass_rate" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          ) : null}

          <Panel title="Case results">
            {results.data?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Case</th>
                      <th className="py-2 pr-3 font-medium">Category</th>
                      <th className="py-2 pr-3 font-medium">Input</th>
                      <th className="py-2 pr-3 font-medium">Risk</th>
                      <th className="py-2 pr-3 font-medium">Intent</th>
                      <th className="py-2 pr-3 font-medium">Tools</th>
                      <th className="py-2 pr-3 font-medium">Grounded</th>
                      <th className="py-2 pr-3 font-medium">Latency</th>
                      <th className="py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs text-primary">
                          {r.evaluation_cases?.case_code}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{r.evaluation_cases?.category}</td>
                        <td className="max-w-xs truncate py-2 pr-3 text-xs">{r.evaluation_cases?.input}</td>
                        <td className="py-2 pr-3">
                          <RiskBadge risk={r.evaluation_cases?.risk_level} />
                        </td>
                        <td className="py-2 pr-3 text-xs">{r.intent_match ? "match" : "miss"}</td>
                        <td className="tabular py-2 pr-3 text-xs">{Number(r.tool_score ?? 0).toFixed(0)}%</td>
                        <td className="tabular py-2 pr-3 text-xs">{Number(r.groundedness ?? 0).toFixed(0)}%</td>
                        <td className="tabular py-2 pr-3 text-xs text-muted-foreground">
                          {fmtNumber(r.latency_ms)} ms
                        </td>
                        <td className="py-2">
                          <StatusBadge status={r.notes === "pending" ? "pending" : r.passed ? "passed" : "failed"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No results yet" />
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
