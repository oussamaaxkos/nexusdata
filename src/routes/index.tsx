import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BadgeCheck, Clock, Gauge, PackageX, Sparkles } from "lucide-react";
import { AppShell } from "@/components/ops/app-shell";
import {
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  RiskBadge,
  StatCard,
  StatusBadge,
  fmtDate,
  fmtNumber,
} from "@/components/ops/primitives";
import { businessStatsQuery, runMetricsQuery, runsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Operations Overview | OpsMind AI" },
      {
        name: "description",
        content:
          "Live view of agentic customer-operations automation: run volume, latency, cost, approvals and grounding quality.",
      },
      { property: "og:title", content: "AI Operations Overview | OpsMind AI" },
      {
        property: "og:description",
        content: "Agentic operations dashboard with automation impact, risk mix and evidence quality.",
      },
    ],
  }),
  component: Dashboard,
});

const MANUAL_MINUTES = 18;
const AGENT_MINUTES = 4.2;
const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Dashboard() {
  const metrics = useQuery(runMetricsQuery);
  const business = useQuery(businessStatsQuery);
  const runs = useQuery(runsQuery(6));

  const m = metrics.data;
  const savedPct = (((MANUAL_MINUTES - AGENT_MINUTES) / MANUAL_MINUTES) * 100).toFixed(1);
  const hoursSaved = m ? ((m.total * (MANUAL_MINUTES - AGENT_MINUTES)) / 60).toFixed(1) : "0";

  return (
    <AppShell>
      <PageHeader
        title="AI Operations Overview"
        subtitle="Agentic investigation of customer operations requests, with evidence grounding, risk routing and human approval on sensitive actions."
        actions={
          <Link
            to="/copilot"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" /> Run an investigation
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Agent runs"
          value={fmtNumber(m?.total)}
          hint={`${m?.successRate ?? 0}% completed`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Avg handling time"
          value={`${AGENT_MINUTES} min`}
          hint={`Manual baseline ${MANUAL_MINUTES} min`}
          trend={`−${savedPct}%`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Human intervention"
          value={`${m?.approvalRate ?? 0}%`}
          hint={`${m?.pendingApprovals ?? 0} awaiting decision`}
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Avg latency"
          value={`${fmtNumber(m?.avgLatency)} ms`}
          hint={`p95 ${fmtNumber(m?.p95Latency)} ms`}
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Run volume and cost"
          description="Daily agent activity across the platform"
        >
          {m && m.byDay.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.byDay}>
                  <defs>
                    <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="runs"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#runsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No runs recorded yet" hint="Start an investigation in the AI Copilot." />
          )}
        </Panel>

        <Panel title="Risk mix" description="Assessed risk level per run">
          {m && m.riskMix.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={m.riskMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {m.riskMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No risk data yet" />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Automation impact" description="Manual investigation versus agent-assisted handling">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Manual", minutes: MANUAL_MINUTES },
                  { name: "OpsMind", minutes: AGENT_MINUTES },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                  <Cell fill="var(--color-chart-3)" />
                  <Cell fill="var(--color-chart-1)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric label="Time saved" value={`${savedPct}%`} />
            <Metric label="Hours saved" value={hoursSaved} />
            <Metric label="Tool calls" value={fmtNumber(m?.toolCalls)} />
          </div>
        </Panel>

        <Panel title="Evidence quality" description="Grounding and verification outcomes">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Docs retrieved" value={fmtNumber(m?.docsRetrieved)} />
            <Metric label="Grounding failures" value={fmtNumber(m?.groundingFailures)} />
            <Metric label="Avg tools / run" value={m?.avgToolsPerRun ?? 0} />
            <Metric label="Tokens" value={fmtNumber(m?.tokens)} />
            <Metric label="Estimated cost" value={`$${m?.cost ?? 0}`} />
            <Metric label="Failed runs" value={fmtNumber(m?.failed)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The agent answers "Insufficient evidence to determine this." whenever a required record or policy
            section is missing, rather than guessing.
          </p>
        </Panel>

        <Panel title="Operations backlog" description="Live business data behind the agent">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Customers" value={fmtNumber(business.data?.customers)} />
            <Metric label="Orders" value={fmtNumber(business.data?.orders)} />
            <Metric label="Delayed orders" value={fmtNumber(business.data?.delayed)} />
            <Metric label="Open tickets" value={fmtNumber(business.data?.openTickets)} />
            <Metric label="All tickets" value={fmtNumber(business.data?.tickets)} />
            <Metric label="Overdue invoices" value={fmtNumber(business.data?.overdueInvoices)} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <PackageX className="h-4 w-4 shrink-0" />
            Delayed shipments are the top driver of inbound requests.
          </div>
        </Panel>
      </div>

      <Panel
        title="Latest agent runs"
        description="Every run is traced, verified and audited"
        actions={
          <Link to="/runs" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        }
      >
        {runs.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Run</th>
                  <th className="py-2 pr-3 font-medium">Request</th>
                  <th className="py-2 pr-3 font-medium">Intent</th>
                  <th className="py-2 pr-3 font-medium">Risk</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => (
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
                    <td className="max-w-sm truncate py-2 pr-3">{r.request}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.intent ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <RiskBadge risk={r.risk_level} />
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="tabular py-2 pr-3 text-muted-foreground">{fmtNumber(r.latency_ms)} ms</td>
                    <td className="py-2 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No runs yet" hint="Open the AI Copilot and investigate a delayed order." />
        )}
      </Panel>
    </AppShell>
  );
}
