import type { QuantumSafeReport } from "@/types/report";

const base = () =>
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const r = await fetch(`${base()}/api/v1/health`);
  if (!r.ok) throw new Error(`Health failed: ${r.status}`);
  return r.json() as Promise<{ status: string; version: string }>;
}

export type LlmProfile = { id: string; label: string; role: string; hint?: string };

export async function fetchLlmDefaults(): Promise<{
  profiles: LlmProfile[];
  env: Record<string, string>;
}> {
  const r = await fetch(`${base()}/api/v1/llm/defaults`);
  if (!r.ok) throw new Error(`LLM defaults failed: ${r.status}`);
  return r.json() as Promise<{
    profiles: LlmProfile[];
    env: Record<string, string>;
  }>;
}

export async function scanRemote(options: {
  root: string;
  useAi?: boolean;
  model?: string | null;
  deepContext?: boolean;
}): Promise<QuantumSafeReport> {
  const r = await fetch(`${base()}/api/v1/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      root: options.root,
      use_ai: options.useAi ?? false,
      model: options.model ?? null,
      deep_context: options.deepContext ?? false,
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(err || `Scan failed: ${r.status}`);
  }
  return r.json() as Promise<QuantumSafeReport>;
}
