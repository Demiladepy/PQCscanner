import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchHealth,
  fetchLlmDefaults,
  scanRemote,
  type LlmProfile,
} from "@/api/client";
import { useReport } from "@/context/ReportContext";
import { isReport, type QuantumSafeReport } from "@/types/report";
import { clsx } from "clsx";

export function ScanPage() {
  const { setReport } = useReport();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gateway, setGateway] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [deepContext, setDeepContext] = useState(false);
  const [modelId, setModelId] = useState("gemini-2.0-flash");
  const [llmProfiles, setLlmProfiles] = useState<LlmProfile[]>([]);

  function probeGateway() {
    setChecking(true);
    fetchHealth()
      .then((h) =>
        setGateway({ ok: true, text: `Gateway v${h.version} · ready` }),
      )
      .catch(() =>
        setGateway({
          ok: false,
          text: "Gateway unreachable — Python API not running on port 8765",
        }),
      )
      .finally(() => setChecking(false));
  }

  useEffect(() => {
    probeGateway();
  }, []);

  useEffect(() => {
    fetchLlmDefaults()
      .then((d) => setLlmProfiles(d.profiles))
      .catch(() => {
        setLlmProfiles([
          { id: "gemini-2.0-flash", label: "Gemini Flash", role: "fast" },
          { id: "gemma-2-9b-it", label: "Gemma 2 9B", role: "pqc" },
        ]);
      });
  }, []);

  function parseFile(file: File) {
    setError(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text) as unknown;
        if (!isReport(data)) {
          throw new Error("JSON does not match QuantumSafe report shape.");
        }
        setReport(data as QuantumSafeReport);
        navigate("/report");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not parse JSON.");
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setBusy(false);
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  }

  async function runLiveDemoScan() {
    setError(null);
    setBusy(true);
    try {
      const data = await scanRemote({
        root: "demo_samples",
        useAi,
        model: useAi ? modelId : null,
        deepContext: useAi && deepContext,
      });
      setReport(data);
      navigate("/report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Live scan failed.");
    } finally {
      setBusy(false);
    }
  }

  async function tryLoadDemo() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/demo-report.json");
      if (!res.ok) throw new Error("Demo report not found.");
      const data = (await res.json()) as unknown;
      if (!isReport(data)) throw new Error("Invalid demo report.");
      setReport(data);
      navigate("/report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo load failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <h1 className="font-display text-[clamp(2rem,2.5vw+1rem,2.65rem)] font-semibold leading-tight tracking-tight text-ink">
          Scan & import
        </h1>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
          Pull a live assessment from the gateway, or drop a report JSON from the CLI.
        </p>
      </header>

      {checking && !gateway ? (
        <p className="text-sm text-muted">Checking gateway…</p>
      ) : null}

      {gateway ? (
        <div
          className={clsx(
            "rounded-2xl border px-5 py-4 ring-1 ring-inset",
            gateway.ok
              ? "border-accent/30 bg-accent/6 ring-accent/10"
              : "border-sev-high/35 bg-sev-high/7 ring-sev-high/15",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={clsx(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                gateway.ok ? "bg-accent shadow-[0_0_12px_oklch(0.74_0.14_58/0.5)]" : "bg-sev-high",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs leading-relaxed text-ink">{gateway.text}</p>
              {!gateway.ok ? (
                <div className="mt-4 space-y-4 text-left">
                  <p className="text-xs leading-relaxed text-muted">
                    The UI talks to the FastAPI app via Vite&apos;s proxy (
                    <code className="font-mono text-[11px] text-ink">/api</code> →{" "}
                    <code className="font-mono text-[11px] text-ink">
                      http://127.0.0.1:8765
                    </code>
                    ). Start the gateway in a{" "}
                    <strong className="text-ink">second terminal</strong> from your monorepo
                    root (the folder that contains{" "}
                    <code className="font-mono text-[11px]">scan.py</code>).
                  </p>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-hero-bg px-4 py-3 font-mono text-[11px] leading-relaxed text-hero-muted">
                    {`cd path\\to\\quantum
pip install -r requirements-quantumsafe.txt
python -m uvicorn quantumsafe.api_app:app --host 127.0.0.1 --port 8765`}
                  </pre>
                  <p className="text-xs text-muted">
                    Or run{" "}
                    <code className="font-mono text-[11px] text-ink">
                      .\\run_gateway.ps1
                    </code>{" "}
                    in PowerShell from that same root. Then click Retry.
                  </p>
                  <button
                    type="button"
                    onClick={probeGateway}
                    disabled={checking}
                    className="rounded-xl border border-border-strong bg-elevated px-4 py-2 text-xs font-bold text-ink transition hover:bg-surface disabled:opacity-50"
                  >
                    {checking ? "Checking…" : "Retry connection"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "01", label: "Gateway", desc: "Optional live scan" },
          { step: "02", label: "Upload", desc: "report.json" },
          { step: "03", label: "Report", desc: "Review & export" },
        ].map((s) => (
          <li
            key={s.step}
            className="rounded-2xl border border-border bg-elevated px-5 py-5 shadow-soft"
          >
            <span className="font-display text-lg font-bold tabular-nums text-accent/90">
              {s.step}
            </span>
            <p className="mt-2 font-semibold text-ink">{s.label}</p>
            <p className="mt-1 text-xs text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>

      <section className="overflow-hidden rounded-2xl border border-border bg-elevated shadow-soft">
        <div className="border-b border-border bg-canvas/35 px-6 py-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Live scan
          </h2>
          <p className="mt-2 text-sm text-muted">
            <code className="font-mono text-xs text-ink">POST /api/v1/scan</code> with{" "}
            <code className="font-mono text-xs text-ink">demo_samples</code> relative to{" "}
            <code className="font-mono text-xs text-ink">QUANTUM_ROOT</code>.
          </p>
        </div>
        <div className="space-y-6 px-6 py-7">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-canvas text-accent focus:ring-2 focus:ring-accent/30"
              />
              <span className="font-semibold">AI assessment</span>
              <span className="text-muted">
                (Gemini or Gemma via Google AI Studio — requires{" "}
                <code className="font-mono text-[11px]">GOOGLE_API_KEY</code> on the gateway)
              </span>
            </label>
          </div>
          {useAi ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold text-ink">Model</span>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-mono text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                >
                  {llmProfiles.length ? (
                    llmProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.id})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemma-2-9b-it">Gemma 2 9B IT</option>
                    </>
                  )}
                </select>
                {llmProfiles.find((p) => p.id === modelId)?.hint ? (
                  <span className="mt-2 block text-xs text-muted">
                    {llmProfiles.find((p) => p.id === modelId)?.hint}
                  </span>
                ) : null}
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 pt-0 text-sm text-ink sm:pt-8">
                <input
                  type="checkbox"
                  checked={deepContext}
                  onChange={(e) => setDeepContext(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border bg-canvas text-accent focus:ring-2 focus:ring-accent/30"
                />
                <span>
                  <span className="font-semibold">Deep context</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    Sends bounded line context around each hit so Gemma can justify patches
                    (larger prompt; recommended for migration engineering).
                  </span>
                </span>
              </label>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={runLiveDemoScan}
              className="rounded-xl border border-border-strong bg-canvas px-7 py-3.5 text-sm font-bold text-ink transition hover:border-accent/35 hover:bg-elevated disabled:opacity-50"
            >
              {busy ? "Scanning…" : "Run scan on demo_samples"}
            </button>
            {useAi ? (
              <p className="self-center text-xs text-muted">
                Uses <code className="font-mono text-[11px]">gemma_pqc.txt</code> when the
                model id contains &quot;gemma&quot;.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border-2 border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center transition hover:border-accent/35 hover:bg-elevated/80"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) parseFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) parseFile(f);
          }}
        />
        <p className="text-sm font-semibold text-ink">Import JSON report</p>
        <p className="mt-2 text-xs text-muted">
          Output from{" "}
          <code className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-border">
            python scan.py --dir ./repo -o report.json
          </code>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-8 rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Reading…" : "Choose file"}
        </button>
        <p className="mt-4 text-xs text-faint">or drag and drop here</p>
      </section>

      <div className="flex flex-wrap justify-start gap-6 border-t border-border pt-10">
        <button
          type="button"
          onClick={tryLoadDemo}
          disabled={busy}
          className="text-sm font-bold text-accent underline-offset-[6px] hover:underline disabled:opacity-50"
        >
          Load offline demo report
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-sev-high/40 bg-sev-high/9 px-5 py-4 text-sm text-sev-high ring-1 ring-inset ring-sev-high/20"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
