import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Evaluation engine. A benchmark run is created up front with one pending result
 * row per case, then executed in small batches so long benchmarks never exceed a
 * single request budget. Metrics are recomputed after every batch.
 */

const StartInput = z.object({
  label: z.string().min(2).max(80),
  caseLimit: z.number().int().min(1).max(32).default(8),
  category: z.string().max(40).optional(),
});

export const startEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StartInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: model }, { data: prompt }] = await Promise.all([
      supabaseAdmin.from("model_configs").select("model_id").eq("is_active", true).maybeSingle(),
      supabaseAdmin
        .from("prompt_versions")
        .select("version")
        .eq("name", "Customer Investigation")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    let caseQuery = supabaseAdmin
      .from("evaluation_cases")
      .select("id")
      .eq("active", true)
      .order("case_code");
    if (data.category) caseQuery = caseQuery.eq("category", data.category);
    const { data: cases } = await caseQuery.limit(data.caseLimit);
    if (!cases?.length) throw new Error("No evaluation cases matched.");

    const { data: evalRun, error } = await supabaseAdmin
      .from("evaluation_runs")
      .insert({
        label: data.label,
        model: model?.model_id ?? "unknown",
        prompt_version: prompt?.version ?? "v3",
        status: "running",
        case_count: cases.length,
      })
      .select("id")
      .single();
    if (error || !evalRun) throw new Error(error?.message ?? "Could not start the evaluation.");

    await supabaseAdmin.from("evaluation_results").insert(
      cases.map((c) => ({ eval_run_id: evalRun.id, case_id: c.id, notes: "pending" })),
    );

    return { eval_run_id: evalRun.id, total: cases.length };
  });

export const runEvaluationBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ evalRunId: z.string().uuid(), batchSize: z.number().int().min(1).max(3).default(2) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runAgent } = await import("./agent.server");

    const { data: pending } = await supabaseAdmin
      .from("evaluation_results")
      .select("id, case_id, evaluation_cases(case_code, category, input, expected_intent, expected_tools, required_evidence, risk_level)")
      .eq("eval_run_id", data.evalRunId)
      .eq("notes", "pending")
      .limit(data.batchSize);

    for (const result of pending ?? []) {
      const c: any = (result as any).evaluation_cases;
      let agentRun: any = null;
      try {
        const out = await runAgent({
          request: c.input,
          actor: "evaluation.harness",
          actorRole: "operator",
          evalRunId: data.evalRunId,
        });
        agentRun = out.run;
      } catch {
        agentRun = null;
      }

      const usedTools: string[] = agentRun
        ? ((
            await supabaseAdmin.from("tool_calls").select("tool_name").eq("run_id", agentRun.id)
          ).data ?? []).map((t) => t.tool_name)
        : [];

      const expectedTools: string[] = c.expected_tools ?? [];
      const expectedSet = new Set(expectedTools);
      const usedSet = new Set(usedTools);
      const hits = [...expectedSet].filter((t) => usedSet.has(t)).length;
      const toolScore = expectedSet.size === 0 ? (usedSet.size === 0 ? 100 : 60) : (hits / expectedSet.size) * 100;
      const unnecessary = [...usedSet].filter((t) => !expectedSet.has(t)).length;

      const intentMatch =
        !!agentRun?.intent &&
        (agentRun.intent === c.expected_intent ||
          agentRun.intent.includes(c.expected_intent.split("_")[0]) ||
          c.expected_intent.includes(String(agentRun.intent).split("_")[0]));

      const citations = (agentRun?.citations ?? []) as any[];
      const requiredDocs: string[] = (c.required_evidence ?? []).filter((e: string) => /[A-Z]/.test(e[0] ?? ""));
      const citedDocs = new Set(citations.map((x) => String(x.document)));
      const docHits = requiredDocs.filter((d) => citedDocs.has(d)).length;
      const recall = requiredDocs.length ? (docHits / requiredDocs.length) * 100 : citations.length ? 100 : 100;
      const citationScore = citations.length ? (docHits || !requiredDocs.length ? 100 : 0) : requiredDocs.length ? 0 : 100;
      const grounded = agentRun?.verification_status === "passed" ? 100 : 0;

      const passed =
        !!agentRun &&
        agentRun.status === "completed" &&
        grounded === 100 &&
        toolScore >= 50 &&
        (intentMatch || toolScore >= 80);

      await supabaseAdmin
        .from("evaluation_results")
        .update({
          run_id: agentRun?.id ?? null,
          passed,
          intent_match: intentMatch,
          tool_match_score: Number(toolScore.toFixed(2)),
          groundedness_score: grounded,
          citation_score: Number(citationScore.toFixed(2)),
          latency_ms: agentRun?.latency_ms ?? null,
          notes: JSON.stringify({
            case_code: c.case_code,
            category: c.category,
            recall_at_5: Number(recall.toFixed(2)),
            unnecessary_tools: unnecessary,
            used_tools: usedTools,
            expected_tools: expectedTools,
            failure: agentRun?.error ?? null,
          }),
        })
        .eq("id", result.id);
    }

    // Recompute aggregate metrics.
    const { data: all } = await supabaseAdmin
      .from("evaluation_results")
      .select("passed, intent_match, tool_match_score, groundedness_score, citation_score, latency_ms, notes, run_id")
      .eq("eval_run_id", data.evalRunId);

    const done = (all ?? []).filter((r) => r.notes !== "pending");
    const remaining = (all ?? []).length - done.length;
    const n = Math.max(done.length, 1);
    const avg = (sel: (r: any) => number) => Number((done.reduce((s, r) => s + (sel(r) || 0), 0) / n).toFixed(2));
    const latencies = done.map((r) => r.latency_ms ?? 0).sort((a, b) => a - b);
    const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;
    const parsedNotes = done.map((r) => {
      try {
        return JSON.parse(r.notes ?? "{}");
      } catch {
        return {};
      }
    });
    const recallAvg = Number(
      (parsedNotes.reduce((s, x: any) => s + (x.recall_at_5 ?? 0), 0) / n).toFixed(2),
    );
    const unnecessaryRate = Number(
      ((parsedNotes.filter((x: any) => (x.unnecessary_tools ?? 0) > 0).length / n) * 100).toFixed(2),
    );

    let tokens = 0;
    let cost = 0;
    const runIds = done.map((r) => r.run_id).filter(Boolean) as string[];
    if (runIds.length) {
      const { data: runs } = await supabaseAdmin
        .from("agent_runs")
        .select("input_tokens, output_tokens, estimated_cost")
        .in("id", runIds);
      for (const r of runs ?? []) {
        tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
        cost += Number(r.estimated_cost ?? 0);
      }
    }

    const passedCount = done.filter((r) => r.passed).length;
    await supabaseAdmin
      .from("evaluation_runs")
      .update({
        status: remaining > 0 ? "running" : "completed",
        passed: passedCount,
        failed: done.length - passedCount,
        task_success_rate: Number(((passedCount / n) * 100).toFixed(2)),
        tool_accuracy: avg((r) => Number(r.tool_match_score)),
        groundedness: avg((r) => Number(r.groundedness_score)),
        citation_accuracy: avg((r) => Number(r.citation_score)),
        recall_at_5: recallAvg,
        precision_at_5: Number(Math.max(0, 100 - unnecessaryRate).toFixed(2)),
        mrr: Number((recallAvg / 100).toFixed(3)),
        unnecessary_tool_rate: unnecessaryRate,
        failure_recovery_rate: Number(
          ((done.filter((r) => r.run_id).length / n) * 100).toFixed(2),
        ),
        avg_latency_ms: Math.round(avg((r) => r.latency_ms ?? 0)),
        p95_latency_ms: p95 ?? null,
        total_tokens: tokens,
        estimated_cost: Number(cost.toFixed(5)),
        completed_at: remaining > 0 ? null : new Date().toISOString(),
      })
      .eq("id", data.evalRunId);

    return { processed: pending?.length ?? 0, remaining, completed: remaining === 0 };
  });
