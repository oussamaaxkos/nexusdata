import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/ops/app-shell";
import { EmptyState, PageHeader, Panel, fmtMoney } from "@/components/ops/primitives";
import { customersQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers | NexusData" },
      {
        name: "description",
        content: "Synthetic enterprise customer base with segments, lifetime value and parent companies.",
      },
      { property: "og:title", content: "Customers | NexusData" },
      { property: "og:description", content: "Structured customer records the agent queries during investigations." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [search, setSearch] = useState("");
  const customers = useQuery(customersQuery(search));

  return (
    <AppShell>
      <PageHeader
        title="Customers"
        subtitle="Structured records the SQL tools query. All data is synthetic."
        actions={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code or email"
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      />
      <Panel>
        {customers.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Segment</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 font-medium">Lifetime value</th>
                </tr>
              </thead>
              <tbody>
                {customers.data.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="py-2 pr-3 font-mono text-xs text-primary">{c.customer_code}</td>
                    <td className="py-2 pr-3">{c.full_name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.email}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.companies?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{c.segment}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.country}</td>
                    <td className="tabular py-2">{fmtMoney(c.lifetime_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No customers match" />
        )}
      </Panel>
    </AppShell>
  );
}
