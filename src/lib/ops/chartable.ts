// Detects whether a tool result can meaningfully be shown as a chart.

export interface ChartSeries {
  title: string;
  labelKey: string;
  valueKeys: string[];
  rows: Record<string, unknown>[];
}

const IGNORED_KEYS = new Set(["id", "run_id", "customer_id", "order_id", "invoice_id"]);

function findRows(output: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(output)) return output.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  if (output && typeof output === "object") {
    for (const key of ["rows", "data", "results", "items"]) {
      const candidate = (output as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) {
        return candidate.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
      }
    }
  }
  return null;
}

function isNumeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") return Number.isFinite(Number(value));
  return false;
}

export function toChartSeries(title: string, output: unknown): ChartSeries | null {
  const rows = findRows(output);
  if (!rows || rows.length < 2 || rows.length > 60) return null;

  const keys = Object.keys(rows[0] ?? {});
  if (keys.length < 2) return null;

  const numericKeys = keys.filter(
    (k) => !IGNORED_KEYS.has(k) && rows.every((r) => r[k] === null || isNumeric(r[k])) && rows.some((r) => isNumeric(r[k])),
  );
  const labelKey = keys.find(
    (k) => !numericKeys.includes(k) && rows.every((r) => typeof r[k] === "string" || typeof r[k] === "number"),
  );
  if (!labelKey || numericKeys.length === 0) return null;

  return {
    title,
    labelKey,
    valueKeys: numericKeys.slice(0, 3),
    rows: rows.map((r) => {
      const next: Record<string, unknown> = { [labelKey]: String(r[labelKey]) };
      for (const k of numericKeys.slice(0, 3)) next[k] = r[k] === null ? 0 : Number(r[k]);
      return next;
    }),
  };
}

export function chartableFromToolCalls(
  calls: { tool_name: string; output: unknown; status?: string }[],
): ChartSeries[] {
  const series: ChartSeries[] = [];
  for (const call of calls) {
    if (call.status && call.status !== "success" && call.status !== "completed") continue;
    const s = toChartSeries(call.tool_name.replace(/_/g, " "), call.output);
    if (s) series.push(s);
  }
  return series;
}
