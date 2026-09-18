import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/ops/app-shell";
import {
  EmptyState,
  PageHeader,
  Panel,
  RiskBadge,
  StatusBadge,
  fmtDate,
  fmtNumber,
} from "@/components/ops/primitives";
import { runsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/runs/")({
  head: () => ({
    meta: [
      { title: "Agent Runs | NexusData" },
      {
        name: "description",
        content: "Every agent investigation with intent, risk level, verification outcome, latency, tokens and cost.",
      },
      { property: "og:title", content: "Agent Runs | NexusData" },
      { property: "og:description", content: "Traceable history of every agentic operations run." },
    ],
  }),
  component: RunsPage,
});

const STATUSES = ["all", "completed", "failed", "running"];

function RunsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const runs = useQuery(runsQuery(200));

  const rows = (runs.data ?? []).filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!search.trim() ||
        r.request.toLowerCase().includes(search.toLowerCase()) ||
        String(r.run_number).includes(search)),
  );

  return (
    <AppShell>
      <PageHeader title="Agent Runs" subtitle="Full history of agentic investigations with traces and metrics." />

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search request or run number"
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  s === status
                    ? "rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium capitalize"
                    : "rounded-md px-2.5 py-1.5 text-xs capitalize text-muted-foreground hover:bg-accent"
                }
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} runs</span>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Run</th>
                  <th className="py-2 pr-3 font-medium">Request</th>
                  <th className="py-2 pr-3 font-medium">Intent</th>
                  <th className="py-2 pr-3 font-medium">Risk</th>
                  <th className="py-2 pr-3 font-medium">Verification</th>
                  <th className="py-2 pr-3 font-medium">Tools</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 pr-3 font-medium">Cost</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="py-2 pr-3">
                      <Link
                        to="/runs/$runId"
                        params={{ runId: r.id }}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        #{r.run_number}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate py-2 pr-3">{r.request}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.intent ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <RiskBadge risk={r.risk_level} />
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={r.verification_status ?? "unknown"} />
                    </td>
                    <td className="tabular py-2 pr-3 text-muted-foreground">{r.tool_call_count}</td>
                    <td className="tabular py-2 pr-3 text-muted-foreground">{fmtNumber(r.latency_ms)} ms</td>
                    <td className="tabular py-2 pr-3 text-muted-foreground">
                      ${Number(r.estimated_cost ?? 0).toFixed(4)}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No runs match" hint="Adjust the filters or run a new investigation." />
        )}
      </Panel>
    </AppShell>
  );
}
