import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const riskStyles: Record<string, string> = {
  LOW: "bg-success/12 text-success border-success/30",
  MEDIUM: "bg-warning/12 text-warning border-warning/30",
  HIGH: "bg-destructive/12 text-destructive border-destructive/30",
  CRITICAL: "bg-critical text-critical-foreground border-critical",
};

export function RiskBadge({ risk }: { risk?: string | null }) {
  const key = (risk ?? "LOW").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        riskStyles[key] ?? riskStyles['LOW'],
      )}
    >
      {key}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  completed: "bg-success/12 text-success border-success/30",
  success: "bg-success/12 text-success border-success/30",
  passed: "bg-success/12 text-success border-success/30",
  approved: "bg-success/12 text-success border-success/30",
  delivered: "bg-success/12 text-success border-success/30",
  paid: "bg-success/12 text-success border-success/30",
  running: "bg-info/12 text-info border-info/30",
  pending: "bg-warning/12 text-warning border-warning/30",
  in_progress: "bg-info/12 text-info border-info/30",
  processing: "bg-info/12 text-info border-info/30",
  open: "bg-info/12 text-info border-info/30",
  delayed: "bg-warning/12 text-warning border-warning/30",
  overdue: "bg-warning/12 text-warning border-warning/30",
  flagged: "bg-warning/12 text-warning border-warning/30",
  changes_requested: "bg-warning/12 text-warning border-warning/30",
  failed: "bg-destructive/12 text-destructive border-destructive/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  denied: "bg-destructive/12 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? "unknown").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[key] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {key.replace(/_/g, " ")}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="tabular mt-3 text-2xl font-semibold">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        {trend ? <span className="text-xs font-medium text-success">{trend}</span> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function fmtMoney(n?: number | null, currency = "EUR") {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number(n),
  );
}

export function fmtNumber(n?: number | null, digits = 0) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(Number(n));
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDay(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
