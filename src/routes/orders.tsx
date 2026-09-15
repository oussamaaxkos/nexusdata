import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/ops/app-shell";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
  fmtDay,
  fmtMoney,
} from "@/components/ops/primitives";
import { ordersQuery } from "@/lib/ops/client-queries";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders & Shipments | OpsMind AI" },
      {
        name: "description",
        content: "Order records with carrier tracking, delay days and delay reasons used as agent evidence.",
      },
      { property: "og:title", content: "Orders & Shipments | OpsMind AI" },
      { property: "og:description", content: "Operational order and shipment data behind every investigation." },
    ],
  }),
  component: OrdersPage,
});

const STATUSES = ["all", "delayed", "shipped", "delivered", "processing", "cancelled", "returned"];

function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const orders = useQuery(ordersQuery(search, status));

  return (
    <AppShell>
      <PageHeader title="Orders & Shipments" subtitle="Joined order and carrier data, exactly what the agent reads." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number"
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  s === status
                    ? "rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium capitalize"
                    : "rounded-md px-2.5 py-1.5 text-xs capitalize text-muted-foreground hover:bg-accent"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {orders.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Order</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 pr-3 font-medium">Promised</th>
                  <th className="py-2 pr-3 font-medium">Carrier</th>
                  <th className="py-2 pr-3 font-medium">Delay</th>
                  <th className="py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((o: any) => {
                  const shipment = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
                  return (
                    <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="py-2 pr-3 font-mono text-xs text-primary">{o.order_number}</td>
                      <td className="py-2 pr-3">
                        {o.customers?.full_name}
                        <span className="ml-1 text-xs text-muted-foreground">({o.customers?.segment})</span>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="tabular py-2 pr-3">{fmtMoney(o.total_amount, o.currency ?? "EUR")}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDay(o.promised_delivery_at)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{shipment?.carrier ?? "—"}</td>
                      <td className="tabular py-2 pr-3">
                        {shipment?.delay_days ? `${shipment.delay_days} d` : "—"}
                      </td>
                      <td className="max-w-[220px] truncate py-2 text-xs text-muted-foreground">
                        {shipment?.delay_reason ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No orders match" />
        )}
      </Panel>
    </AppShell>
  );
}
