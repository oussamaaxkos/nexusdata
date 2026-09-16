import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel } from "@/components/ops/primitives";
import { activateModel } from "@/lib/ops/agent.functions";
import { modelsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Management | OpsMind AI" },
      {
        name: "description",
        content: "Swap the reasoning model behind the agent: provider, context window, temperature and token pricing.",
      },
      { property: "og:title", content: "Model Management | OpsMind AI" },
      { property: "og:description", content: "Provider-agnostic model registry with cost and capability metadata." },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const qc = useQueryClient();
  const models = useQuery(modelsQuery);
  const activate = useServerFn(activateModel);

  return (
    <AppShell>
      <PageHeader
        title="Model Management"
        subtitle="The agent talks to a provider-agnostic LLM interface, so switching model is a configuration change, not a code change."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(models.data ?? []).map((m) => (
          <Panel key={m.id} className={m.is_active ? "ring-1 ring-primary" : undefined}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{m.display_name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{m.model_id}</p>
              </div>
              {m.is_active ? (
                <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
                  Active
                </span>
              ) : m.available ? (
                <button
                  onClick={async () => {
                    try {
                      await activate({ data: { id: m.id } });
                      toast.success(`${m.display_name} is now the reasoning model.`);
                      qc.invalidateQueries({ queryKey: ["model_configs"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not activate this model.");
                    }
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  Activate
                </button>
              ) : (
                <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Unavailable
                </span>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</dt>
                <dd className="mt-0.5 font-medium">{m.provider}</dd>
              </div>
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</dt>
                <dd className="mt-0.5 font-medium capitalize">{m.role}</dd>
              </div>
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Temperature</dt>
                <dd className="tabular mt-0.5 font-medium">{m.temperature}</dd>
              </div>
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Max output</dt>
                <dd className="tabular mt-0.5 font-medium">{m.max_output_tokens}</dd>
              </div>
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Input / 1k</dt>
                <dd className="tabular mt-0.5 font-medium">${m.input_cost_per_1k}</dd>
              </div>
              <div className="rounded-md border border-border bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Output / 1k</dt>
                <dd className="tabular mt-0.5 font-medium">${m.output_cost_per_1k}</dd>
              </div>
            </dl>

            {m.notes ? <p className="mt-3 text-xs text-muted-foreground">{m.notes}</p> : null}
          </Panel>
        ))}
        {models.data?.length === 0 ? <EmptyState title="No models configured" /> : null}
      </div>
    </AppShell>
  );
}
