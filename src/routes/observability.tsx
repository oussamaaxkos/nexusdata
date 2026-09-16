import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, Metric, PageHeader, Panel, StatCard, fmtNumber } from "@/components/ops/primitives";
import { runMetricsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/observability")({
  head: () => ({
    meta: [
      { title: "Observability | OpsMind AI" },
      {
        name: "description",
        content: "Latency, token usage, cost, tool volume, approval rate and grounding failures across agent runs.",
      },
      { property: "og:title", content: "Observability | OpsMind AI" },
      { property: "og:description", content: "Production telemetry for an agentic AI system." },
    ],
  }),
  component: ObservabilityPage,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};

function ObservabilityPage() {
  const { data: m } = useQuery(runMetricsQuery);

  return (
    <AppShell>
      <PageHeader
        title="Observability"
        subtitle="Every run is instrumented: node timings, tool volume, token usage, cost and verification outcomes."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total runs" value={fmtNumber(m?.total)} hint={`${m?.successRate ?? 0}% success`} />
        <StatCard label="p95 latency" value={`${fmtNumber(m?.p95Latency)} ms`} hint={`avg ${fmtNumber(m?.avgLatency)} ms`} />
        <StatCard label="Total cost" value={`$${m?.cost ?? 0}`} hint={`${fmtNumber(m?.tokens)} tokens`} />
        <StatCard
          label="Grounding failures"
          value={fmtNumber(m?.groundingFailures)}
          hint="verification rejected a claim"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Latency trend" description="Average latency per day (ms)">
          {m?.byDay.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="latency" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No telemetry yet" />
          )}
        </Panel>

        <Panel title="Cost per day" description="Estimated gateway spend (USD)">
          {m?.byDay.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cost" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No cost data yet" />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Throughput and reliability">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Completed" value={fmtNumber(m?.completed)} />
            <Metric label="Failed" value={fmtNumber(m?.failed)} />
            <Metric label="Tool calls" value={fmtNumber(m?.toolCalls)} />
            <Metric label="Avg tools / run" value={m?.avgToolsPerRun ?? 0} />
            <Metric label="Docs retrieved" value={fmtNumber(m?.docsRetrieved)} />
            <Metric label="Pending approvals" value={fmtNumber(m?.pendingApprovals)} />
          </div>
        </Panel>

        <Panel title="Human intervention">
          <p className="tabular text-3xl font-semibold">{m?.approvalRate ?? 0}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share of runs that produced an action requiring a manager decision. Lower is more autonomous; zero would
            mean the risk engine never escalates.
          </p>
        </Panel>

        <Panel title="Top intents">
          {m?.intentMix.length ? (
            <ul className="space-y-1 text-sm">
              {m.intentMix.map((i) => (
                <li key={i.name} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-1.5">
                  <span className="font-mono text-xs">{i.name}</span>
                  <span className="tabular text-xs text-muted-foreground">{i.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No intents recorded" />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
