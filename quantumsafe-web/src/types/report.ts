export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ScanSummary {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  estimated_total_migration_hours: number;
  compliance_gaps: string[];
  /** Set when report was produced by Gemini/Gemma */
  llm_model?: string;
  llm_deep_context?: boolean;
}

export interface Finding {
  id: string;
  file: string;
  line_start: number;
  line_end: number;
  severity: Severity | string;
  algorithm: string;
  algorithm_class: string;
  vulnerability: string;
  hndl_risk: string;
  migration_complexity: string;
  vulnerable_code: string;
  recommended_replacement: string;
  migration_patch: string;
  hybrid_option: string;
  test_suggestion: string;
  estimated_hours: number;
  dependencies: string[];
  compliance: Record<string, string>;
}

export interface MigrationPhase {
  phase: number;
  name: string;
  findings: string[];
  estimated_hours: number;
  rationale: string;
}

export interface QuantumSafeReport {
  scan_summary: ScanSummary;
  findings: Finding[];
  migration_plan: {
    phases: MigrationPhase[];
  };
  /** Present when LLM assessment (e.g. Gemma PQC prompt) returned a leadership brief */
  executive_summary?: string;
}

export function isReport(x: unknown): x is QuantumSafeReport {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.scan_summary === "object" &&
    Array.isArray(o.findings) &&
    typeof o.migration_plan === "object"
  );
}
