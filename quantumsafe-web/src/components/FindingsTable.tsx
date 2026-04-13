import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { Finding } from "@/types/report";
import { SeverityBadge } from "@/components/SeverityBadge";

type SortKey = "severity" | "file" | "algorithm";

const rank: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const [sort, setSort] = useState<SortKey>("severity");
  const [openId, setOpenId] = useState<string | null>(findings[0]?.id ?? null);

  const rows = useMemo(() => {
    const copy = [...findings];
    copy.sort((a, b) => {
      if (sort === "file") return a.file.localeCompare(b.file);
      if (sort === "algorithm") return a.algorithm.localeCompare(b.algorithm);
      const ra = rank[String(a.severity).toUpperCase()] ?? 9;
      const rb = rank[String(b.severity).toUpperCase()] ?? 9;
      return ra - rb;
    });
    return copy;
  }, [findings, sort]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-elevated shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border bg-canvas/30 px-6 py-5">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            Findings
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            Expand a row for snippets and patch guidance.
          </p>
        </div>
        <div className="flex flex-wrap rounded-xl bg-surface/80 p-1 ring-1 ring-border/80">
          {(["severity", "file", "algorithm"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-xs font-bold capitalize transition duration-200",
                sort === k
                  ? "bg-elevated text-ink shadow-soft ring-1 ring-border"
                  : "text-muted hover:bg-canvas/50 hover:text-ink",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((f) => {
          const expanded = openId === f.id;
          return (
            <li key={f.id} className="bg-elevated">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : f.id)}
                className="flex w-full flex-col gap-3 px-6 py-4 text-left transition duration-200 hover:bg-canvas/35 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                  <SeverityBadge value={String(f.severity)} />
                  <span className="font-mono text-sm font-semibold text-ink">{f.id}</span>
                  <span className="truncate text-sm text-muted">{f.file}</span>
                </div>
                <span className="text-sm font-semibold text-ink">{f.algorithm}</span>
              </button>
              {expanded ? (
                <div className="border-t border-border bg-canvas/25 px-6 py-7">
                  <p className="max-w-[68ch] text-sm leading-relaxed text-ink">{f.vulnerability}</p>
                  <div className="mt-8 grid gap-8 lg:grid-cols-2">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
                        Vulnerable snippet
                      </h4>
                      <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-ink">
                        {f.vulnerable_code}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
                        Recommended
                      </h4>
                      <p className="mt-3 text-sm leading-relaxed text-ink">
                        {f.recommended_replacement}
                      </p>
                      <h4 className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
                        Patch sketch
                      </h4>
                      <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-ink">
                        {f.migration_patch}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
