import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ops/app-shell";
import { Metric, PageHeader, Panel } from "@/components/ops/primitives";
import { modelsQuery, promptsQuery, toolRegistryQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | NexusData" },
      {
        name: "description",
        content: "Risk thresholds, role permissions, retrieval configuration and platform architecture for NexusData.",
      },
      { property: "og:title", content: "Settings | NexusData" },
      { property: "og:description", content: "Governance configuration of the agentic operations platform." },
    ],
  }),
  component: SettingsPage,
});

const ROLES = [
  { role: "Viewer", scope: "Read dashboards, knowledge base and run history.", tools: "Retrieval and catalogue lookups." },
  { role: "Operator", scope: "Run investigations, open and update tickets.", tools: "All read tools plus MEDIUM-risk writes." },
  { role: "Manager", scope: "Decide approvals, execute refunds and customer emails.", tools: "HIGH and CRITICAL actions after review." },
  { role: "Admin", scope: "Manage prompts, models, tools and retention.", tools: "Everything, fully audited." },
];

function SettingsPage() {
  const models = useQuery(modelsQuery);
  const prompts = useQuery(promptsQuery);
  const tools = useQuery(toolRegistryQuery);

  const activeModel = models.data?.find((m) => m.is_active);
  const activePrompt = prompts.data?.find((p) => p.is_active && p.name === "Customer Investigation");

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Governance configuration: who can do what, when a human must decide, and how evidence is retrieved."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Active configuration">
          <div className="grid gap-2">
            <Metric label="Reasoning model" value={<span className="font-mono text-xs">{activeModel?.model_id ?? "—"}</span>} />
            <Metric label="System prompt" value={activePrompt ? `${activePrompt.name} ${activePrompt.version}` : "—"} />
            <Metric label="Registered tools" value={tools.data?.length ?? 0} />
          </div>
        </Panel>

        <Panel title="Risk thresholds">
          <ul className="space-y-2 text-xs">
            <li className="rounded-md border border-border bg-surface-2 px-3 py-2">
              <span className="font-medium">LOW / MEDIUM</span> — executed automatically and audited.
            </li>
            <li className="rounded-md border border-border bg-surface-2 px-3 py-2">
              <span className="font-medium">Refunds over €250</span> — promoted to HIGH, manager approval required.
            </li>
            <li className="rounded-md border border-border bg-surface-2 px-3 py-2">
              <span className="font-medium">Refunds over €1,000</span> — CRITICAL, approval plus decision note.
            </li>
            <li className="rounded-md border border-border bg-surface-2 px-3 py-2">
              <span className="font-medium">Customer emails</span> — never sent directly by the agent.
            </li>
          </ul>
        </Panel>

        <Panel title="Retrieval">
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>Hybrid retrieval: full-text search with a keyword-recall fallback.</li>
            <li>Lexical reranking, top-k capped at 10 chunks per query.</li>
            <li>Section-aware chunking at roughly 900 characters.</li>
            <li>Citations are verified against retrieved chunks; unmatched ones are stripped.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Roles and permissions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Scope</th>
                <th className="py-2 font-medium">Tool access</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.role} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium">{r.role}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.scope}</td>
                  <td className="py-2 text-muted-foreground">{r.tools}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Safety and data handling">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>All customer data in this environment is synthetic; no real personal data is stored.</li>
          <li>
            The agent answers "Insufficient evidence to determine this." instead of guessing when a record or policy
            section is missing.
          </li>
          <li>Tool inputs are schema-validated and the agent can only run vetted read-only analytics queries.</li>
          <li>Secrets live in server-side environment variables and are never exposed to the browser.</li>
          <li>Every run, tool call and human decision is written to the immutable audit log.</li>
        </ul>
      </Panel>
    </AppShell>
  );
}
