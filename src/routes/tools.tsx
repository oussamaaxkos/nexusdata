import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel, RiskBadge } from "@/components/ops/primitives";
import { toolRegistryQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tool Registry & MCP | NexusData" },
      {
        name: "description",
        content:
          "Every agent capability with its JSON schema, category, permission level, risk level and approval requirement.",
      },
      { property: "og:title", content: "Tool Registry & MCP | NexusData" },
      { property: "og:description", content: "MCP-compatible tool contracts behind the operations agent." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const tools = useQuery(toolRegistryQuery);

  return (
    <AppShell>
      <PageHeader
        title="Tool Registry & MCP"
        subtitle="Tools are declared once with a schema, a permission level and a risk level, then executed through a single guarded entry point."
      />

      <Panel title="Why this is MCP-compatible">
        <p className="text-sm text-muted-foreground">
          Each tool is a named contract with a JSON-schema input, a typed result and declared permissions — the same
          shape the Model Context Protocol expects. Exposing the registry over an MCP server is a transport change:
          the definitions, validation, permission checks and audit logging stay exactly as they are here.
        </p>
      </Panel>

      <Panel title="Registered tools" description={`${tools.data?.length ?? 0} capabilities`}>
        {tools.data?.length ? (
          <div className="space-y-2">
            {tools.data.map((t: any) => (
              <details key={t.id} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-primary">{t.name}</span>
                  <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {t.category}
                  </span>
                  <RiskBadge risk={t.risk_level} />
                  <span className="rounded-md border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                    {t.permission_level}
                  </span>
                  {t.requires_approval ? (
                    <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
                      Approval required
                    </span>
                  ) : null}
                </summary>
                <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
                {t.parameters ? (
                  <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(t.parameters, null, 2)}
                  </pre>
                ) : null}
              </details>
            ))}
          </div>
        ) : (
          <EmptyState title="No tools registered" />
        )}
      </Panel>
    </AppShell>
  );
}
