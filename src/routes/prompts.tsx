import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel, fmtDate } from "@/components/ops/primitives";
import { activatePromptVersion } from "@/lib/ops/agent.functions";
import { promptsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompt Management | OpsMind AI" },
      {
        name: "description",
        content: "Versioned system prompts with changelogs, side-by-side comparison and one-click activation.",
      },
      { property: "og:title", content: "Prompt Management | OpsMind AI" },
      { property: "og:description", content: "Prompt versioning and rollout control for the operations agent." },
    ],
  }),
  component: PromptsPage,
});

function PromptsPage() {
  const qc = useQueryClient();
  const prompts = useQuery(promptsQuery);
  const activate = useServerFn(activatePromptVersion);
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);

  const list = prompts.data ?? [];
  const leftPrompt = list.find((p) => p.id === left) ?? list.find((p) => p.is_active) ?? list[0];
  const rightPrompt = list.find((p) => p.id === right) ?? list.find((p) => p.id !== leftPrompt?.id);

  return (
    <AppShell>
      <PageHeader
        title="Prompt Management"
        subtitle="Prompts are data, not code. Each version records its changelog and can be activated without a deploy."
      />

      <Panel title="Versions">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Version</th>
                  <th className="py-2 pr-3 font-medium">Changelog</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-primary">{p.version}</td>
                    <td className="max-w-md truncate py-2 pr-3 text-xs text-muted-foreground">{p.changelog}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(p.created_at)}</td>
                    <td className="py-2">
                      {p.is_active ? (
                        <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs text-success">
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await activate({ data: { id: p.id } });
                              toast.success(`${p.name} ${p.version} activated.`);
                              qc.invalidateQueries({ queryKey: ["prompt_versions"] });
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Could not activate.");
                            }
                          }}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No prompts stored" />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { side: "A", prompt: leftPrompt, setter: setLeft },
          { side: "B", prompt: rightPrompt, setter: setRight },
        ].map(({ side, prompt, setter }) => (
          <Panel
            key={side}
            title={`Version ${side}`}
            actions={
              <select
                value={prompt?.id ?? ""}
                onChange={(e) => setter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.version}
                  </option>
                ))}
              </select>
            }
          >
            {prompt ? (
              <>
                <p className="mb-2 text-xs text-muted-foreground">{prompt.changelog}</p>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-[11px] leading-relaxed">
                  {prompt.content}
                </pre>
              </>
            ) : (
              <EmptyState title="Nothing to compare" />
            )}
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
