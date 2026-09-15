import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export const runsQuery = (limit = 50) =>
  queryOptions({
    queryKey: ["agent_runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

export const runQuery = (runId: string, poll = false) =>
  queryOptions({
    queryKey: ["agent_run", runId],
    refetchInterval: poll ? 1500 : false,
    queryFn: async () => {
      const [run, steps, tools, approvals] = await Promise.all([
        supabase.from("agent_runs").select("*").eq("id", runId).maybeSingle(),
        supabase.from("agent_steps").select("*").eq("run_id", runId).order("step_index"),
        supabase.from("tool_calls").select("*").eq("run_id", runId).order("created_at"),
        supabase.from("approvals").select("*").eq("run_id", runId).order("requested_at"),
      ]);
      return {
        run: run.data,
        steps: steps.data ?? [],
        tools: tools.data ?? [],
        approvals: approvals.data ?? [],
      };
    },
  });

export const approvalsQuery = (status?: string) =>
  queryOptions({
    queryKey: ["approvals", status ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("approvals")
        .select("*, agent_runs(run_number, request, actor, model, confidence)")
        .order("requested_at", { ascending: false })
        .limit(100);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const auditQuery = queryOptions({
  queryKey: ["audit_logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*, agent_runs(run_number)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return data ?? [];
  },
});

export const documentsQuery = queryOptions({
  queryKey: ["documents"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const chunksQuery = (documentId: string) =>
  queryOptions({
    queryKey: ["chunks", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_chunks")
        .select("id, chunk_index, section, content, token_estimate")
        .eq("document_id", documentId)
        .order("chunk_index");
      if (error) throw error;
      return data ?? [];
    },
  });

export const customersQuery = (search: string) =>
  queryOptions({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("id, customer_code, full_name, email, segment, lifetime_value, country, companies(name, tier)")
        .order("lifetime_value", { ascending: false })
        .limit(60);
      if (search.trim()) {
        q = q.or(
          `full_name.ilike.%${search}%,customer_code.ilike.%${search}%,email.ilike.%${search}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const ordersQuery = (search: string, status: string) =>
  queryOptions({
    queryKey: ["orders", search, status],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select(
          "id, order_number, status, channel, total_amount, currency, placed_at, promised_delivery_at, delivered_at, customers(customer_code, full_name, segment), shipments(carrier, status, delay_days, delay_reason, tracking_number)",
        )
        .order("placed_at", { ascending: false })
        .limit(60);
      if (status !== "all") q = q.eq("status", status);
      if (search.trim()) q = q.ilike("order_number", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const evaluationRunsQuery = queryOptions({
  queryKey: ["evaluation_runs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("evaluation_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return data ?? [];
  },
});

export const evaluationResultsQuery = (evalRunId: string) =>
  queryOptions({
    queryKey: ["evaluation_results", evalRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_results")
        .select("*, evaluation_cases(case_code, category, input, expected_intent, risk_level)")
        .eq("eval_run_id", evalRunId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const evaluationCasesQuery = queryOptions({
  queryKey: ["evaluation_cases"],
  queryFn: async () => {
    const { data, error } = await supabase.from("evaluation_cases").select("*").order("case_code");
    if (error) throw error;
    return data ?? [];
  },
});

export const promptsQuery = queryOptions({
  queryKey: ["prompt_versions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("prompt_versions")
      .select("*")
      .order("name")
      .order("version");
    if (error) throw error;
    return data ?? [];
  },
});

export const modelsQuery = queryOptions({
  queryKey: ["model_configs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("model_configs").select("*").order("provider");
    if (error) throw error;
    return data ?? [];
  },
});

export const toolRegistryQuery = queryOptions({
  queryKey: ["tool_registry"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tool_registry").select("*").order("category");
    if (error) throw error;
    return data ?? [];
  },
});

export const businessStatsQuery = queryOptions({
  queryKey: ["business_stats"],
  queryFn: async () => {
    const [orders, delayed, tickets, openTickets, customers, invoices] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delayed"),
      supabase.from("tickets").select("id", { count: "exact", head: true }),
      supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
    ]);
    return {
      orders: orders.count ?? 0,
      delayed: delayed.count ?? 0,
      tickets: tickets.count ?? 0,
      openTickets: openTickets.count ?? 0,
      customers: customers.count ?? 0,
      overdueInvoices: invoices.count ?? 0,
    };
  },
});

export interface RunMetrics {
  total: number;
  completed: number;
  failed: number;
  avgLatency: number;
  p95Latency: number;
  toolCalls: number;
  avgToolsPerRun: number;
  tokens: number;
  cost: number;
  docsRetrieved: number;
  approvalRate: number;
  interventionRate: number;
  successRate: number;
  groundingFailures: number;
  pendingApprovals: number;
  byDay: Array<{ day: string; runs: number; failed: number; cost: number; latency: number }>;
  riskMix: Array<{ name: string; value: number }>;
  intentMix: Array<{ name: string; value: number }>;
}

export const runMetricsQuery = queryOptions({
  queryKey: ["run_metrics"],
  queryFn: async (): Promise<RunMetrics> => {
    const [{ data: runs }, { count: pending }] = await Promise.all([
      supabase
        .from("agent_runs")
        .select(
          "id, status, latency_ms, input_tokens, output_tokens, estimated_cost, tool_call_count, documents_retrieved, approval_required, risk_level, verification_status, intent, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const list = runs ?? [];
    const total = list.length;
    const completed = list.filter((r) => r.status === "completed").length;
    const failed = list.filter((r) => r.status === "failed").length;
    const latencies = list.map((r) => r.latency_ms ?? 0).filter(Boolean).sort((a, b) => a - b);
    const avgLatency = latencies.length ? latencies.reduce((s, v) => s + v, 0) / latencies.length : 0;
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] ?? latencies.at(-1)! : 0;
    const toolCalls = list.reduce((s, r) => s + (r.tool_call_count ?? 0), 0);
    const tokens = list.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0);
    const cost = list.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0);
    const docs = list.reduce((s, r) => s + (r.documents_retrieved ?? 0), 0);
    const approvals = list.filter((r) => r.approval_required).length;
    const grounding = list.filter((r) => r.verification_status === "failed").length;

    const dayMap = new Map<string, { runs: number; failed: number; cost: number; latency: number }>();
    for (const r of list) {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      const entry = dayMap.get(day) ?? { runs: 0, failed: 0, cost: 0, latency: 0 };
      entry.runs += 1;
      if (r.status === "failed") entry.failed += 1;
      entry.cost += Number(r.estimated_cost ?? 0);
      entry.latency += r.latency_ms ?? 0;
      dayMap.set(day, entry);
    }
    const byDay = [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, v]) => ({
        day: day.slice(5),
        runs: v.runs,
        failed: v.failed,
        cost: Number(v.cost.toFixed(4)),
        latency: Math.round(v.latency / Math.max(v.runs, 1)),
      }));

    const tally = (key: "risk_level" | "intent") => {
      const map = new Map<string, number>();
      for (const r of list) {
        const k = (r[key] as string) ?? "unknown";
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    return {
      total,
      completed,
      failed,
      avgLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95),
      toolCalls,
      avgToolsPerRun: total ? Number((toolCalls / total).toFixed(2)) : 0,
      tokens,
      cost: Number(cost.toFixed(4)),
      docsRetrieved: docs,
      approvalRate: total ? Number(((approvals / total) * 100).toFixed(1)) : 0,
      interventionRate: total ? Number(((approvals / total) * 100).toFixed(1)) : 0,
      successRate: total ? Number(((completed / total) * 100).toFixed(1)) : 0,
      groundingFailures: grounding,
      pendingApprovals: pending ?? 0,
      byDay,
      riskMix: tally("risk_level"),
      intentMix: tally("intent").slice(0, 6),
    };
  },
});
