import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel, StatusBadge, fmtDate, fmtNumber } from "@/components/ops/primitives";
import { deleteDocument, ingestDocument } from "@/lib/ops/agent.functions";
import { documentsQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/ingestion")({
  head: () => ({
    meta: [
      { title: "Document Ingestion | NexusData" },
      {
        name: "description",
        content: "Validate, parse, clean, chunk and index internal documents into the retrieval layer.",
      },
      { property: "og:title", content: "Document Ingestion | NexusData" },
      { property: "og:description", content: "The ingestion pipeline that feeds grounded agent answers." },
    ],
  }),
  component: IngestionPage,
});

const PIPELINE = ["Validate", "Parse", "Clean", "Chunk", "Metadata", "Index"];

function IngestionPage() {
  const qc = useQueryClient();
  const documents = useQuery(documentsQuery);
  const ingest = useServerFn(ingestDocument);
  const remove = useServerFn(deleteDocument);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "Operations",
    document_type: "policy",
    version: "v1.0",
    author: "Operations",
    tags: "",
    content: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res: any = await ingest({ data: { ...form, source_format: "txt" } });
      toast.success(`Indexed ${res?.chunks ?? 0} chunks from "${form.title}".`);
      setForm({ ...form, title: "", content: "", tags: "" });
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ingestion failed.");
    } finally {
      setBusy(false);
    }
  }

  const totalChunks = (documents.data ?? []).reduce((s, d) => s + (d.chunk_count ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="Document Ingestion"
        subtitle="Documents pass through validation, parsing, cleaning, section-aware chunking, metadata extraction and full-text indexing."
      />

      <Panel title="Pipeline" description={`${documents.data?.length ?? 0} documents · ${fmtNumber(totalChunks)} chunks indexed`}>
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium">
                {i + 1}. {stage}
              </span>
              {i < PIPELINE.length - 1 ? <span className="text-muted-foreground">→</span> : null}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Ingest a document" description="Plain text or markdown; headings become sections">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Department</span>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Type</span>
                <input
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Version</span>
                <input
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Tags (comma separated)</span>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">Content</span>
              <textarea
                required
                rows={10}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={"Section 1 Scope\n\nThis policy applies to…"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Run ingestion
            </button>
          </form>
        </Panel>

        <Panel title="Indexed documents">
          {documents.data?.length ? (
            <div className="space-y-2">
              {documents.data.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.department} · {d.version} · {d.chunk_count ?? 0} chunks · {fmtDate(d.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                  <button
                    aria-label={`Delete ${d.title}`}
                    onClick={async () => {
                      try {
                        await remove({ data: { id: d.id } });
                        toast.success("Document removed from the index.");
                        qc.invalidateQueries({ queryKey: ["documents"] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not delete.");
                      }
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing indexed yet" />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
