import { clsx } from "clsx";
import { Link } from "react-router-dom";
import { useReport } from "@/context/ReportContext";
import { FindingsTable } from "@/components/FindingsTable";

const sevTopBar: Record<string, string> = {
  Critical: "bg-sev-critical",
  High: "bg-sev-high",
  Medium: "bg-sev-medium",
  Low: "bg-sev-low",
};

const sevTint: Record<string, string> = {
  Critical: "bg-sev-critical/8",
  High: "bg-sev-high/8",
  Medium: "bg-sev-medium/10",
  Low: "bg-sev-low/8",
};

export function ReportPage() {
  const { report, clear } = useReport();

  if (!report) {
    return (
      <div className="flex flex-col items-start justify-center rounded-[1.75rem] border border-border bg-elevated px-8 py-20 shadow-soft sm:px-12 sm:py-24">
        <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
          <svg
            className="h-7 w-7 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          No report loaded
        </h1>
        <p className="mt-3 max-w-[42ch] text-left text-sm leading-relaxed text-muted">
          Run a scan or import JSON to see findings, severity, and migration phases here.
        </p>
        <Link
          to="/scan"
          className="mt-10 inline-flex rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground transition hover:bg-accent-hover"
        >
          Go to Scan
        </Link>
      </div>
    );
  }

  const s = report.scan_summary;
  const execBrief = report.executive_summary;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">
            Assessment
          </p>
          <h1 className="font-display mt-3 text-[clamp(2rem,3vw+1rem,2.75rem)] font-semibold leading-tight tracking-tight text-ink">
            Exposure summary
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-base">
            {s.total_findings} findings · ~{s.estimated_total_migration_hours}h estimated effort
            {s.llm_model ? (
              <>
                {" "}
                ·{" "}
                <span className="font-mono text-xs text-ink">
                  {s.llm_model}
                  {s.llm_deep_context ? " + context" : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-border-strong hover:bg-elevated hover:text-ink"
        >
          Clear report
        </button>
      </div>

      {execBrief ? (
        <section className="rounded-2xl border border-accent/25 bg-accent/7 px-7 py-6 ring-1 ring-inset ring-accent/15">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            Executive summary
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink">{execBrief}</p>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Critical", s.critical],
            ["High", s.high],
            ["Medium", s.medium],
            ["Low", s.low],
          ] as const
        ).map(([label, n]) => (
          <div
            key={label}
            className={clsx(
              "relative overflow-hidden rounded-2xl border border-border bg-elevated pb-5 pl-5 pr-4 pt-6 shadow-soft",
              sevTint[label],
            )}
          >
            <div
              className={clsx(
                "absolute inset-x-0 top-0 h-1 rounded-t-2xl",
                sevTopBar[label] ?? "bg-border-strong",
              )}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {label}
            </p>
            <p className="font-display mt-2 text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {n}
            </p>
          </div>
        ))}
      </section>

      {s.compliance_gaps?.length ? (
        <section className="rounded-2xl border border-border bg-surface px-7 py-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            Compliance gaps
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {s.compliance_gaps.map((g) => (
              <li
                key={g}
                className="rounded-lg bg-elevated px-3 py-1.5 font-mono text-xs text-ink ring-1 ring-border"
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FindingsTable findings={report.findings} />

      <section className="overflow-hidden rounded-2xl border border-border bg-elevated shadow-soft">
        <div className="border-b border-border bg-canvas/40 px-7 py-5">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            Migration plan
          </h2>
          <p className="mt-2 text-sm text-muted">
            Phased rollout — tune order to your dependency graph.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {report.migration_plan.phases.map((p) => (
            <li key={p.phase} className="px-7 py-6">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-sm font-bold tabular-nums text-accent">
                  {String(p.phase).padStart(2, "0")}
                </span>
                <span className="font-semibold text-ink">{p.name}</span>
              </div>
              <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted">{p.rationale}</p>
              <p className="mt-3 font-mono text-[11px] text-faint">
                ~{p.estimated_hours}h · {p.findings.length} finding(s)
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
