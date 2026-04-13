import { Link } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";

const pillars = [
  {
    title: "Discover",
    body: "Static rules across languages and infra configs surface RSA, ECC, TLS, SSH, and common API misuse — fast, repeatable inventory.",
  },
  {
    title: "Assess",
    body: "Optional cloud model pass enriches severity, migration complexity, and compliance tags — same JSON contract as offline mode.",
  },
  {
    title: "Migrate",
    body: "Structured findings, phased plans, and patch sketches your teams can turn into PRs and change tickets.",
  },
];

const standards = ["ML-KEM (FIPS 203)", "ML-DSA (FIPS 204)", "Hybrid TLS / dual-sig"];

export function HomePage() {
  return (
    <div className="flex flex-col gap-20 lg:gap-24">
      <section className="hero-vault noise-fine shadow-hero motion-safe-reveal relative overflow-hidden rounded-[1.75rem] px-6 py-14 text-hero-text sm:px-10 sm:py-16 lg:px-14 lg:py-[4.5rem]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-hero-muted/10 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-2xl lg:max-w-none">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-hero-muted motion-safe-reveal-delay-1 motion-safe-reveal">
              Cryptographic exposure · Migration planning
            </p>
            <h1 className="font-display motion-safe-reveal-delay-1 motion-safe-reveal mt-5 max-w-[18ch] text-balance text-[clamp(2rem,4vw+1rem,3.35rem)] font-semibold leading-[1.05] tracking-tight text-hero-text sm:max-w-[22ch]">
              Know where classical crypto lives — before harvest-now-decrypt-later matters.
            </h1>
            <p className="motion-safe-reveal-delay-2 motion-safe-reveal mt-7 max-w-[52ch] text-base leading-[1.65] text-hero-muted sm:text-lg">
              QuantumSafe maps quantum-vulnerable primitives in code and configuration,
              scores risk, and outputs migration-ready reports aligned with NIST PQC
              direction — built for security and platform teams, not slide decks.
            </p>
            <div className="motion-safe-reveal-delay-2 motion-safe-reveal mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/scan"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground transition duration-200 hover:bg-accent-hover"
              >
                Start a scan
              </Link>
              <Link
                to="/report"
                className="inline-flex items-center justify-center rounded-xl border border-hero-muted/35 bg-hero-surface/40 px-7 py-3.5 text-sm font-bold text-hero-text backdrop-blur-sm transition duration-200 hover:border-hero-muted/55 hover:bg-hero-surface/70"
              >
                Open report
              </Link>
            </div>
            <div className="motion-safe-reveal-delay-3 motion-safe-reveal mt-12 flex flex-wrap gap-2 border-t border-hero-muted/20 pt-9">
              {standards.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-hero-muted/25 bg-hero-bg/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-hero-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden justify-end pb-2 opacity-[0.14] lg:flex">
            <LogoMark className="h-36 w-36 text-hero-text" />
          </div>
        </div>
      </section>

      <section className="motion-safe-reveal">
        <div className="mb-10 max-w-xl">
          <h2 className="font-display text-[clamp(1.65rem,2vw+1rem,2.15rem)] font-semibold leading-tight tracking-tight text-ink">
            One pipeline, three outcomes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            CLI, HTTP gateway, and this UI share the same report schema — no drift between
            engineering and leadership views.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <article
              key={p.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-elevated p-7 shadow-soft transition duration-300 hover:border-border-strong hover:shadow-[0_20px_50px_oklch(0.05_0.02_60/0.35)]"
            >
              <span className="font-display text-2xl font-bold tabular-nums text-faint transition duration-300 group-hover:text-accent/90">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display mt-4 text-xl font-semibold tracking-tight text-ink">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="motion-safe-reveal relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-11 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-accent/6 to-transparent" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Ready when your gateway is
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Run the Python gateway locally, use &quot;Scan demo_samples via API&quot; on the
              Scan page, or import JSON produced by{" "}
              <code className="rounded-md bg-canvas px-2 py-0.5 font-mono text-[11px] text-ink ring-1 ring-border">
                scan.py
              </code>
              .
            </p>
          </div>
          <Link
            to="/scan"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border-strong bg-canvas px-7 py-3.5 text-sm font-bold text-ink transition duration-200 hover:border-accent/40 hover:bg-elevated"
          >
            Go to Scan
          </Link>
        </div>
      </section>
    </div>
  );
}
