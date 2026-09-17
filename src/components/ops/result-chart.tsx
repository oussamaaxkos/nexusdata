import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import type { ChartSeries } from "@/lib/ops/chartable";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"];

export function ResultChart({ series }: { series: ChartSeries }) {
  const [kind, setKind] = useState<"bar" | "line">("bar");

  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium capitalize">{series.title}</p>
        <div className="flex gap-1">
          {(["bar", "line"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={
                kind === k
                  ? "rounded border border-primary/50 bg-primary/10 px-2 py-0.5 text-[11px] capitalize text-primary"
                  : "rounded border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground hover:text-foreground"
              }
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={series.rows} margin={{ top: 8, right: 8, bottom: 8, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={series.labelKey} tick={{ fontSize: 11 }} interval={0} angle={-15} height={48} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {series.valueKeys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
              {series.valueKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={series.rows} margin={{ top: 8, right: 8, bottom: 8, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={series.labelKey} tick={{ fontSize: 11 }} interval={0} angle={-15} height={48} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {series.valueKeys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
              {series.valueKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
