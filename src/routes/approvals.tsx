import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/ops/app-shell";
import {
  EmptyState,
  PageHeader,
  Panel,
  RiskBadge,
  StatusBadge,
  fmtDate,
  fmtMoney,
} from "@/components/ops/primitives";
import { decideApproval } from "@/lib/ops/agent.functions";
import { approvalsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | OpsMind AI" },
      {
        name: "description",
        content: "Human-in-the-loop queue for high and critical agent actions such as refunds and customer emails.",
      },
      { property: "og:title", content: "Approvals | OpsMind AI" },
      { property: "og:description", content: "Approve, reject or request changes on sensitive agent actions." },
    ],
  }),
  component: ApprovalsPage,
});

const TABS = ["pending", "approved", "rejected", "changes_requested", "all"];

function ApprovalsPage() {
  const [tab, setTab] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();
  const decide = useServerFn(decideApproval);
  const approvals = useQuery(approvalsQuery(tab === "all" ? undefined : tab));

  async function act(id: string, decision: "approved" | "rejected" | "changes_requested") {
    setBusyId(id);
    try {
      const res: any = await decide({
        data: { approvalId: id, decision, note: notes[id] ?? undefined, decidedBy: "daniel.okafor" },
      });
      toast.success(res?.executionNote ?? `Request ${decision.replace("_", " ")}.`);
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
      qc.invalidateQueries({ queryKey: ["run_metrics"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The decision could not be recorded.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Approvals"
        subtitle="The agent never executes HIGH or CRITICAL actions. Each proposal arrives with its evidence, justification and monetary impact."
      />

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              t === tab
                ? "rounded-md bg-secondary px-3 py-1.5 text-xs font-medium capitalize"
                : "rounded-md px-3 py-1.5 text-xs capitalize text-muted-foreground hover:bg-accent"
            }
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {approvals.data?.length ? (
        <div className="space-y-4">
          {approvals.data.map((a: any) => (
            <Panel key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-primary">{a.action_type}</span>
                    <RiskBadge risk={a.risk_level} />
                    <StatusBadge status={a.status} />
                    {a.amount ? (
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                        {fmtMoney(a.amount)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium">{a.summary}</p>
                  <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{a.justification}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Requested {fmtDate(a.requested_at)}</p>
                  {a.agent_runs ? (
                    <Link to="/runs/$runId" params={{ runId: a.run_id }} className="text-primary hover:underline">
                      Run #{a.agent_runs.run_number}
                    </Link>
                  ) : null}
                </div>
              </div>

              {a.agent_runs?.request ? (
                <p className="mt-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                  Original request: {a.agent_runs.request}
                </p>
              ) : null}

              {Array.isArray(a.evidence) && a.evidence.length ? (
                <ul className="mt-3 space-y-1">
                  {a.evidence.slice(0, 3).map((e: any, i: number) => (
                    <li key={i} className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
                      <span className="font-medium">{e.document}</span>
                      <span className="text-muted-foreground"> · {e.section}</span>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{e.excerpt}</p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {a.status === "pending" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <input
                    value={notes[a.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                    placeholder="Decision note (optional)"
                    className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    disabled={busyId === a.id}
                    onClick={() => act(a.id, "approved")}
                    className="rounded-md bg-success px-3 py-2 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Approve &amp; execute
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => act(a.id, "changes_requested")}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    Request changes
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => act(a.id, "rejected")}
                    className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  Decided by {a.decided_by ?? "—"} on {fmtDate(a.decided_at)}
                  {a.decision_note ? ` · "${a.decision_note}"` : ""}
                  {a.executed ? " · action executed and audited" : ""}
                </div>
              )}
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="Nothing in this queue"
            hint="Refunds above the auto-approval threshold and customer emails land here."
          />
        </Panel>
      )}
    </AppShell>
  );
}
