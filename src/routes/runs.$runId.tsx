import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
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
import { runQuery } from "@/lib/ops/client-queries";
import { cn } from "@/lib/utils";
import { MessageResponse } from "@/components/ai-elements/message";

export const Route = createFileRoute("/runs/$runId")({
  head: () => ({
    meta: [
      { title: "Run Trace | OpsMind AI" },
      {
        name: "description",
        content: "Node-by-node execution trace of an agent run: plan, tools, evidence, verification and approvals.",
      },
      { property: "og:title", content: "Run Trace | OpsMind AI" },
      { property: "og:description", content: "Full agent trace with inputs, outputs, timings and citations." },
    ],
  }),
  component: RunDetail,
});

function RunDetail() {
  const { runId } = Route.useParams();
  const { data, isLoading } = useQuery(runQuery(runId));
  const [open, setOpen] = useState<string | null>(null);

  const run = data?.run;
  const citations = (run?.citations ?? []) as any[];
  const evidence = (run?.evidence ?? []) as any[];
  const plan = (run?.plan ?? []) as string[];

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading trace…</p>
      </AppShell>
    );
  }

  if (!run) {
    return (
      <AppShell>
        <EmptyState title="Run not found" hint="It may have been removed." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`Run #${run.run_number}`}
        subtitle={run.request}
        actions={
          <Link to="/runs" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
            Back to runs
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Status" value={<StatusBadge status={run.status} />} />
        <Metric label="Risk" value={<RiskBadge risk={run.risk_level} />} />
        <Metric label="Confidence" value={`${Math.round((run.confidence ?? 0) * 100)}%`} />
        <Metric label="Latency" value={`${fmtNumber(run.latency_ms)} ms`} />
        <Metric label="Tokens" value={fmtNumber((run.input_tokens ?? 0) + (run.output_tokens ?? 0))} />
        <Metric label="Cost" value={`$${Number(run.estimated_cost ?? 0).toFixed(4)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel title="Execution trace" description="Each node records status, duration, input and output">
            <ol className="space-y-2">
              {data.steps.map((s: any) => {
                const isOpen = open === s.id;
                return (
                  <li key={s.id} className="rounded-md border border-border bg-surface-2">
                    <button
                      onClick={() => setOpen(isOpen ? null : s.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left"
                    >
                      <ChevronRight
                        className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                      />
                      <span className="flex-1 text-sm font-medium">{s.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{s.node}</span>
                      <span className="tabular text-xs text-muted-foreground">{fmtNumber(s.duration_ms)} ms</span>
                      <StatusBadge status={s.status} />
                    </button>
                    {isOpen ? (
                      <div className="border-t border-border px-3 py-3">
                        {s.error ? (
                          <p className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            {s.error}
                          </p>
                        ) : null}
                        <pre className="max-h-72 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                          {JSON.stringify(s.detail, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title="Tool calls" description="Inputs, outputs, permission level and risk">
            {data.tools.length ? (
              <div className="space-y-2">
                {data.tools.map((t: any) => (
                  <details key={t.id} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-primary">{t.tool_name}</span>
                      <RiskBadge risk={t.risk_level} />
                      <StatusBadge status={t.status} />
                      <span className="tabular ml-auto text-xs text-muted-foreground">
                        {fmtNumber(t.duration_ms)} ms
                      </span>
                    </summary>
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      <pre className="max-h-56 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(t.input, null, 2)}
                      </pre>
                      <pre className="max-h-56 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(t.output, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState title="No tool calls recorded" />
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Final response">
            <MessageResponse className="text-sm leading-6">
              {run.final_response ?? run.error ?? "—"}
            </MessageResponse>
            {run.reasoning_summary ? (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {run.reasoning_summary}
              </p>
            ) : null}
          </Panel>

          <Panel title="Plan">
            {plan.length ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                {plan.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No plan recorded" />
            )}
          </Panel>

          <Panel title="Verification" description={run.verification_status ?? "not run"}>
            <StatusBadge status={run.verification_status ?? "unknown"} />
            <p className="mt-2 text-xs text-muted-foreground">{run.verification_notes || "No issues detected."}</p>
          </Panel>

          <Panel title="Citations">
            {citations.length ? (
              <ul className="space-y-2">
                {citations.map((c, i) => (
                  <li key={i} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-medium">{c.document}</p>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {c.section} · {c.version} · effective {c.effective_date}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{c.excerpt}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No policy citations" />
            )}
          </Panel>

          <Panel title="Evidence">
            {evidence.length ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {evidence.map((e, i) => (
                  <li key={i} className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono">
                    {e.label}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No records retrieved" />
            )}
          </Panel>

          <Panel title="Approvals">
            {data.approvals.length ? (
              <ul className="space-y-2">
                {data.approvals.map((a: any) => (
                  <li key={a.id} className="rounded-md border border-border bg-surface-2 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary">{a.action_type}</span>
                      <RiskBadge risk={a.risk_level} />
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-muted-foreground">{a.summary}</p>
                    <p className="mt-1 text-muted-foreground">Requested {fmtDate(a.requested_at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No approvals required" />
            )}
          </Panel>

          <Panel title="Execution context">
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Model" value={<span className="font-mono text-xs">{run.model ?? "—"}</span>} />
              <Metric label="Prompt" value={run.prompt_version ?? "—"} />
              <Metric label="Actor" value={run.actor ?? "—"} />
              <Metric label="Role" value={run.actor_role ?? "—"} />
              <Metric label="Docs retrieved" value={fmtNumber(run.documents_retrieved)} />
              <Metric label="Created" value={<span className="text-xs">{fmtDate(run.created_at)}</span>} />
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
