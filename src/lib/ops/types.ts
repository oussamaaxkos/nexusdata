// Browser-safe shared types for the OpsMind agent platform.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PermissionLevel = "viewer" | "operator" | "manager" | "admin";

export interface Citation {
  document: string;
  section: string;
  version: string;
  effective_date: string;
  excerpt: string;
  score: number;
}

export interface EvidenceItem {
  kind: "record" | "document" | "computation";
  label: string;
  source: string;
  detail?: string;
}

export interface ProposedAction {
  action_type: string;
  summary: string;
  justification: string;
  risk_level: RiskLevel;
  amount?: number | null;
  payload?: Record<string, unknown>;
}

export interface AgentStepView {
  node: string;
  label: string;
  status: string;
  detail: Record<string, unknown>;
  started_offset_ms: number;
  duration_ms: number;
  error?: string | null;
}

export interface AgentRunResult {
  run_id: string;
  run_number: number;
  status: string;
  intent: string | null;
  final_response: string | null;
  reasoning_summary: string | null;
  confidence: number | null;
  risk_level: RiskLevel | null;
  verification_status: string | null;
  verification_notes: string | null;
  approval_required: boolean;
  approval_status: string;
  citations: Citation[];
  evidence: EvidenceItem[];
  plan: string[];
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  tool_call_count: number;
  documents_retrieved: number;
  model: string | null;
  prompt_version: string | null;
  error: string | null;
}

export const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function riskTone(risk?: string | null) {
  switch (risk) {
    case "CRITICAL":
      return "critical" as const;
    case "HIGH":
      return "high" as const;
    case "MEDIUM":
      return "medium" as const;
    default:
      return "low" as const;
  }
}
