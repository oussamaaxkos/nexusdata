import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel, StatusBadge, fmtDay } from "@/components/ops/primitives";
import { chunksQuery, documentsQuery } from "@/lib/ops/client-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base | NexusData" },
      {
        name: "description",
        content: "Indexed internal policies, procedures and manuals retrieved by the agent as cited evidence.",
      },
      { property: "og:title", content: "Knowledge Base | NexusData" },
      { property: "og:description", content: "Versioned policy documents with chunk-level retrieval." },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const documents = useQuery(documentsQuery);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const docId = selected ?? documents.data?.[0]?.id ?? "";
  const chunks = useQuery({ ...chunksQuery(docId), enabled: Boolean(docId) });
  const doc = documents.data?.find((d) => d.id === docId);

  const visible = (documents.data ?? []).filter(
    (d) =>
      !filter.trim() ||
      d.title.toLowerCase().includes(filter.toLowerCase()) ||
      (d.department ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        title="Knowledge Base"
        subtitle="Every policy is versioned and chunked. The agent may only cite chunks it actually retrieved."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Documents" description={`${documents.data?.length ?? 0} indexed`}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title or department"
            className="mb-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ul className="space-y-1">
            {visible.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setSelected(d.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    d.id === docId
                      ? "border-primary/50 bg-accent"
                      : "border-transparent hover:border-border hover:bg-accent/50",
                  )}
                >
                  <p className="text-xs font-medium">{d.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {d.department} · {d.version} · {d.chunk_count ?? 0} chunks
                  </p>
                </button>
              </li>
            ))}
            {visible.length === 0 ? <EmptyState title="No documents match" /> : null}
          </ul>
        </Panel>

        <Panel
          title={doc?.title ?? "Select a document"}
          description={doc ? `${doc.document_type} · effective ${fmtDay(doc.effective_date)}` : undefined}
          actions={doc ? <StatusBadge status={doc.status} /> : null}
        >
          {doc ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border px-2 py-1">Department: {doc.department}</span>
                <span className="rounded-md border border-border px-2 py-1">Version: {doc.version}</span>
                <span className="rounded-md border border-border px-2 py-1">Author: {doc.author ?? "—"}</span>
                <span className="rounded-md border border-border px-2 py-1">Format: {doc.source_format}</span>
                {(doc.tags ?? []).map((t: string) => (
                  <span key={t} className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                    {t}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {(chunks.data ?? []).map((c) => (
                  <article key={c.id} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-medium">{c.section}</p>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        chunk {c.chunk_index} · ~{c.token_estimate ?? 0} tokens
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{c.content}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No document selected" />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
