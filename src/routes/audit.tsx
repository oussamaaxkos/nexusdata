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
import { auditQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs | NexusData" },
      {
        name: "description",
        content: "Immutable record of every agent run, tool execution and human decision, filterable by actor and risk.",
      },
      { property: "og:title", content: "Audit Logs | NexusData" },
      { property: "og:description", content: "Compliance-grade trail of agent and human activity." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const logs = useQuery(auditQuery);
  const [actor, setActor] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const all = logs.data ?? [];
  const actors = ["all", ...new Set(all.map((l) => l.actor).filter(Boolean))] as string[];

  const rows = all.filter(
    (l: any) =>
      (actor === "all" || l.actor === actor) &&
      (risk === "all" || l.risk_level === risk) &&
      (status === "all" || l.status === status) &&
      (!search.trim() ||
        JSON.stringify(l).toLowerCase().includes(search.toLowerCase())),
  );

  const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <AppShell>
      <PageHeader
        title="Audit Logs"
        subtitle="Who asked, what the agent did, which tools ran, what was decided and how long it took."
      />

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, tool or run"
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select value={actor} onChange={(e) => setActor(e.target.value)} className={selectClass}>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All actors" : a}
              </option>
            ))}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className={selectClass}>
            {["all", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All risk levels" : r}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            {["all", "success", "flagged", "failure"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} entries</span>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Tools</th>
                  <th className="py-2 pr-3 font-medium">Risk</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 font-medium">Run</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l: any) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(l.created_at)}</td>
                    <td className="py-2 pr-3">{l.actor}</td>
                    <td className="py-2 pr-3 text-xs capitalize text-muted-foreground">{l.actor_role ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{l.event_type}</td>
                    <td className="py-2 pr-3 text-xs">{l.action}</td>
                    <td className="max-w-[200px] truncate py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {l.tool ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <RiskBadge risk={l.risk_level} />
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="tabular py-2 pr-3 text-xs text-muted-foreground">
                      {l.latency_ms ? `${fmtNumber(l.latency_ms)} ms` : "—"}
                    </td>
                    <td className="py-2">
                      {l.run_id ? (
                        <Link
                          to="/runs/$runId"
                          params={{ runId: l.run_id }}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          #{l.agent_runs?.run_number ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No audit entries match" />
        )}
      </Panel>
    </AppShell>
  );
}
