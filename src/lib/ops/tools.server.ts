// Tool layer: every capability the agent can invoke.
// Each tool declares a JSON schema, a permission level and a risk level, and is
// executed through a single registry entry point so that logging, validation and
// permission checks are uniform. This is the same shape an MCP server would expose.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PermissionLevel, RiskLevel } from "./types";

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  permission_level: PermissionLevel;
  risk_level: RiskLevel;
  /** HIGH/CRITICAL tools never execute directly: they become proposed actions. */
  requires_approval: boolean;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, any>) => Promise<unknown>;
}

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  viewer: 0,
  operator: 1,
  manager: 2,
  admin: 3,
};

function obj(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties, required, additionalProperties: false };
}

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

async function notFound(kind: string, key: string) {
  return { found: false, error: `${kind} ${key} was not found.` };
}

/* ------------------------------ RAG ------------------------------ */

export async function searchKnowledgeBase(args: {
  query: string;
  department?: string | null;
  top_k?: number;
}) {
  const topK = Math.min(Math.max(args.top_k ?? 5, 1), 10);
  const terms = (args.query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3);

  let query = supabaseAdmin
    .from("document_chunks")
    .select(
      "id, chunk_index, section, content, documents!inner(id, title, department, document_type, version, effective_date)",
    );

  if (args.department) {
    query = query.eq("documents.department", args.department);
  }

  // Hybrid retrieval: full-text first, keyword fallback for recall.
  const websearch = terms.slice(0, 8).join(" OR ");
  const primary = websearch
    ? await query.textSearch("search_vector", websearch, { type: "websearch" }).limit(40)
    : await query.limit(40);

  let rows = primary.data ?? [];
  if (rows.length === 0 && terms.length) {
    const fallback = await supabaseAdmin
      .from("document_chunks")
      .select(
        "id, chunk_index, section, content, documents!inner(id, title, department, document_type, version, effective_date)",
      )
      .or(terms.slice(0, 4).map((t) => `content.ilike.%${t}%`).join(","))
      .limit(40);
    rows = fallback.data ?? [];
  }

  // Lexical rerank stage (a cross-encoder reranker would plug in here).
  const scored = rows
    .map((r: any) => {
      const haystack = `${r.section} ${r.content}`.toLowerCase();
      let hits = 0;
      for (const t of terms) if (haystack.includes(t)) hits += 1;
      const score = terms.length ? hits / terms.length : 0.3;
      return {
        document: r.documents.title,
        department: r.documents.department,
        section: r.section,
        version: r.documents.version,
        effective_date: r.documents.effective_date,
        excerpt: r.content,
        score: Number(score.toFixed(3)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((r) => r.score > 0 || terms.length === 0);

  return {
    found: scored.length > 0,
    chunks: scored,
    note: scored.length === 0 ? "No indexed policy content matched this query." : undefined,
  };
}

/* --------------------------- SQL catalogue --------------------------- */

const SQL_CATALOGUE: Record<string, (params: Record<string, any>) => Promise<unknown>> = {
  delayed_orders_count: async () => {
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delayed");
    return { delayed_orders: count ?? 0 };
  },
  orders_by_status: async () => {
    const { data } = await supabaseAdmin.from("orders").select("status");
    const tally: Record<string, number> = {};
    for (const r of data ?? []) tally[r.status] = (tally[r.status] ?? 0) + 1;
    return { counts: tally };
  },
  top_customers_by_ltv: async (p) => {
    const { data } = await supabaseAdmin
      .from("customers")
      .select("customer_code, full_name, segment, lifetime_value")
      .order("lifetime_value", { ascending: false })
      .limit(Math.min(p.limit ?? 5, 25));
    return { customers: data ?? [] };
  },
  avg_order_value_by_segment: async () => {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("total_amount, customers!inner(segment)")
      .limit(2000);
    const agg: Record<string, { sum: number; n: number }> = {};
    for (const r of (data ?? []) as any[]) {
      const seg = r.customers.segment;
      agg[seg] ??= { sum: 0, n: 0 };
      agg[seg].sum += Number(r.total_amount);
      agg[seg].n += 1;
    }
    return {
      segments: Object.entries(agg).map(([segment, v]) => ({
        segment,
        avg_order_value: Number((v.sum / v.n).toFixed(2)),
        orders: v.n,
      })),
    };
  },
  overdue_invoices: async () => {
    const { data } = await supabaseAdmin
      .from("invoices")
      .select("invoice_number, amount, due_at")
      .eq("status", "overdue")
      .limit(500);
    const total = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return { count: data?.length ?? 0, total_amount: Number(total.toFixed(2)) };
  },
  tickets_by_category: async () => {
    const { data } = await supabaseAdmin.from("tickets").select("category").limit(2000);
    const tally: Record<string, number> = {};
    for (const r of data ?? []) tally[r.category] = (tally[r.category] ?? 0) + 1;
    return { counts: tally };
  },
  customer_tickets: async (p) => {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("customer_code", String(p.customer_code ?? ""))
      .maybeSingle();
    if (!customer) return notFound("Customer", String(p.customer_code));
    const { data } = await supabaseAdmin
      .from("tickets")
      .select("ticket_number, subject, category, priority, status, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20);
    return { tickets: data ?? [] };
  },
};

export const SQL_QUERY_NAMES = Object.keys(SQL_CATALOGUE);

/* ------------------------------ Tools ------------------------------ */

export const TOOLS: ToolDefinition[] = [
  {
    name: "search_knowledge_base",
    description:
      "Hybrid search over indexed internal policy documents, guidelines, procedures and manuals. Always use this before stating any policy rule.",
    category: "rag",
    permission_level: "viewer",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj(
      {
        query: str("Natural-language search query"),
        department: {
          type: ["string", "null"],
          description: "Optional department filter, e.g. Finance, Logistics, Legal",
        },
        top_k: num("How many chunks to return (1-10)"),
      },
      ["query", "department", "top_k"],
    ),
    execute: (a) => searchKnowledgeBase(a as any),
  },
  {
    name: "query_database",
    description: `Run a vetted read-only analytics query. Allowed query_name values: ${SQL_QUERY_NAMES.join(", ")}.`,
    category: "sql",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj(
      {
        query_name: str("One of the allowed catalogue query names"),
        params: { type: ["object", "null"], description: "Optional parameters", additionalProperties: true },
      },
      ["query_name", "params"],
    ),
    execute: async (a) => {
      const fn = SQL_CATALOGUE[a.query_name];
      if (!fn) return { error: `Unknown query_name. Allowed: ${SQL_QUERY_NAMES.join(", ")}` };
      return fn(a.params ?? {});
    },
  },
  {
    name: "get_customer",
    description: "Fetch a customer profile by customer code (CUS-00001) or email.",
    category: "sql",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj(
      {
        customer_code: { type: ["string", "null"], description: "Customer code" },
        email: { type: ["string", "null"], description: "Customer email" },
      },
      ["customer_code", "email"],
    ),
    execute: async (a) => {
      let q = supabaseAdmin
        .from("customers")
        .select("customer_code, full_name, email, segment, lifetime_value, country, companies(name, industry, tier)");
      if (a.customer_code) q = q.eq("customer_code", a.customer_code);
      else if (a.email) q = q.eq("email", a.email);
      else return { error: "Provide customer_code or email." };
      const { data } = await q.maybeSingle();
      return data ? { found: true, customer: data } : notFound("Customer", a.customer_code ?? a.email);
    },
  },
  {
    name: "get_order",
    description: "Fetch an order with items, customer and delivery dates. Order numbers look like #40291.",
    category: "sql",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj({ order_number: str("Order number, e.g. #40291") }, ["order_number"]),
    execute: async (a) => {
      const num = String(a.order_number).startsWith("#") ? a.order_number : `#${a.order_number}`;
      const { data } = await supabaseAdmin
        .from("orders")
        .select(
          "order_number, status, channel, total_amount, currency, placed_at, promised_delivery_at, delivered_at, customers(customer_code, full_name, segment, email), order_items(quantity, unit_price, line_total, products(sku, name))",
        )
        .eq("order_number", num)
        .maybeSingle();
      return data ? { found: true, order: data } : notFound("Order", num);
    },
  },
  {
    name: "get_shipment",
    description: "Fetch carrier tracking, delay days and delay reason for an order.",
    category: "api",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj({ order_number: str("Order number, e.g. #40291") }, ["order_number"]),
    execute: async (a) => {
      const num = String(a.order_number).startsWith("#") ? a.order_number : `#${a.order_number}`;
      const { data } = await supabaseAdmin
        .from("shipments")
        .select("carrier, tracking_number, status, delay_days, delay_reason, last_scan_location, shipped_at, estimated_delivery_at, delivered_at, orders!inner(order_number)")
        .eq("orders.order_number", num)
        .maybeSingle();
      return data ? { found: true, shipment: data } : notFound("Shipment for order", num);
    },
  },
  {
    name: "get_invoice",
    description: "Fetch an invoice by invoice number or by order number.",
    category: "sql",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj(
      {
        invoice_number: { type: ["string", "null"], description: "Invoice number" },
        order_number: { type: ["string", "null"], description: "Order number" },
      },
      ["invoice_number", "order_number"],
    ),
    execute: async (a) => {
      if (a.invoice_number) {
        const { data } = await supabaseAdmin
          .from("invoices")
          .select("invoice_number, amount, tax_amount, status, issued_at, due_at, paid_at, orders(order_number)")
          .eq("invoice_number", a.invoice_number)
          .maybeSingle();
        return data ? { found: true, invoice: data } : notFound("Invoice", a.invoice_number);
      }
      if (a.order_number) {
        const num = String(a.order_number).startsWith("#") ? a.order_number : `#${a.order_number}`;
        const { data } = await supabaseAdmin
          .from("invoices")
          .select("invoice_number, amount, tax_amount, status, issued_at, due_at, paid_at, orders!inner(order_number)")
          .eq("orders.order_number", num)
          .maybeSingle();
        return data ? { found: true, invoice: data } : notFound("Invoice for order", num);
      }
      return { error: "Provide invoice_number or order_number." };
    },
  },
  {
    name: "get_ticket",
    description: "Fetch a support ticket by ticket number (TCK-00001).",
    category: "sql",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj({ ticket_number: str("Ticket number") }, ["ticket_number"]),
    execute: async (a) => {
      const { data } = await supabaseAdmin
        .from("tickets")
        .select("ticket_number, subject, body, category, priority, status, sentiment, created_at, resolved_at, customers(customer_code, full_name), orders(order_number)")
        .eq("ticket_number", a.ticket_number)
        .maybeSingle();
      return data ? { found: true, ticket: data } : notFound("Ticket", a.ticket_number);
    },
  },
  {
    name: "search_products",
    description: "Search the product catalogue by name, SKU or category.",
    category: "sql",
    permission_level: "viewer",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj({ query: str("Search text") }, ["query"]),
    execute: async (a) => {
      const { data } = await supabaseAdmin
        .from("products")
        .select("sku, name, category, unit_price, stock_qty")
        .or(`name.ilike.%${a.query}%,sku.ilike.%${a.query}%,category.ilike.%${a.query}%`)
        .limit(10);
      return { products: data ?? [] };
    },
  },
  {
    name: "calculate_compensation",
    description:
      "Deterministic calculator applying the Shipping Compensation Policy tiers. Use it instead of estimating amounts yourself.",
    category: "logic",
    permission_level: "operator",
    risk_level: "LOW",
    requires_approval: false,
    parameters: obj(
      {
        order_number: str("Order number"),
        delay_days: num("Business days late beyond the promised delivery date"),
      },
      ["order_number", "delay_days"],
    ),
    execute: async (a) => {
      const num = String(a.order_number).startsWith("#") ? a.order_number : `#${a.order_number}`;
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("order_number, total_amount, customers(segment)")
        .eq("order_number", num)
        .maybeSingle();
      if (!order) return notFound("Order", num);
      const delay = Number(a.delay_days ?? 0);
      const segment = (order as any).customers?.segment ?? "SMB";
      let pct = 0;
      let tier = "not eligible";
      if (delay >= 21) {
        pct = 15;
        tier = "above 20 business days";
      } else if (delay >= 11) {
        pct = 10;
        tier = "11-20 business days";
      } else if (delay >= 7) {
        pct = 5;
        tier = "7-10 business days";
      }
      if (pct > 0 && segment === "Enterprise") {
        pct = Math.min(pct + 5, 20);
        tier += " (+ enterprise uplift)";
      }
      const raw = (Number(order.total_amount) * pct) / 100;
      const amount = Math.min(raw, 2500);
      return {
        eligible: pct > 0,
        percentage: pct,
        tier,
        order_value: Number(order.total_amount),
        amount: Number(amount.toFixed(2)),
        capped: raw > 2500,
        approval_required: amount > 250,
        policy: "Shipping Compensation Policy v3.2, Section 4.2 and 6.1",
      };
    },
  },
  {
    name: "create_ticket",
    description: "Open a new support ticket for a customer. Medium risk, executed immediately and audited.",
    category: "write",
    permission_level: "operator",
    risk_level: "MEDIUM",
    requires_approval: false,
    parameters: obj(
      {
        customer_code: str("Customer code"),
        subject: str("Ticket subject"),
        body: str("Ticket body"),
        priority: str("low | medium | high | urgent"),
      },
      ["customer_code", "subject", "body", "priority"],
    ),
    execute: async (a) => {
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("customer_code", a.customer_code)
        .maybeSingle();
      if (!customer) return notFound("Customer", a.customer_code);
      const ticketNumber = `TCK-A${Date.now().toString().slice(-6)}`;
      const { error } = await supabaseAdmin.from("tickets").insert({
        ticket_number: ticketNumber,
        customer_id: customer.id,
        subject: a.subject,
        body: a.body,
        category: "other",
        priority: ["low", "medium", "high", "urgent"].includes(a.priority) ? a.priority : "medium",
        status: "open",
      });
      if (error) return { error: error.message };
      return { created: true, ticket_number: ticketNumber };
    },
  },
  {
    name: "update_ticket",
    description: "Update the status or priority of an existing ticket.",
    category: "write",
    permission_level: "operator",
    risk_level: "MEDIUM",
    requires_approval: false,
    parameters: obj(
      {
        ticket_number: str("Ticket number"),
        status: { type: ["string", "null"], description: "New status" },
        priority: { type: ["string", "null"], description: "New priority" },
      },
      ["ticket_number", "status", "priority"],
    ),
    execute: async (a) => {
      const patch: Record<string, string> = {};
      if (a.status) patch.status = a.status;
      if (a.priority) patch.priority = a.priority;
      if (!Object.keys(patch).length) return { error: "Nothing to update." };
      const { error, count } = await supabaseAdmin
        .from("tickets")
        .update(patch, { count: "exact" })
        .eq("ticket_number", a.ticket_number);
      if (error) return { error: error.message };
      return { updated: (count ?? 0) > 0 };
    },
  },
  {
    name: "create_email_draft",
    description:
      "Queue an external customer email. HIGH risk: this never sends directly, it creates an approval request for a manager.",
    category: "write",
    permission_level: "manager",
    risk_level: "HIGH",
    requires_approval: true,
    parameters: obj(
      {
        customer_code: str("Customer code"),
        subject: str("Email subject"),
        body: str("Email body grounded in verified evidence"),
      },
      ["customer_code", "subject", "body"],
    ),
    execute: async () => ({ queued_for_approval: true }),
  },
  {
    name: "issue_refund",
    description:
      "Issue a refund or goodwill credit. CRITICAL risk: this never executes directly, it creates an approval request.",
    category: "write",
    permission_level: "manager",
    risk_level: "CRITICAL",
    requires_approval: true,
    parameters: obj(
      {
        order_number: str("Order number"),
        amount: num("Refund amount in EUR"),
        reason: str("Policy-backed reason"),
      },
      ["order_number", "amount", "reason"],
    ),
    execute: async () => ({ queued_for_approval: true }),
  },
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

export function canExecute(tool: ToolDefinition, actorRole: PermissionLevel) {
  return PERMISSION_RANK[actorRole] >= PERMISSION_RANK[tool.permission_level];
}

/** OpenAI-compatible tool definitions for the gateway request. */
export function toolSchemasForModel() {
  return TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: `${t.description} [risk: ${t.risk_level}]`,
      parameters: t.parameters,
    },
  }));
}
