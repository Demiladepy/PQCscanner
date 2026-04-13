import { clsx } from "clsx";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";

const nav = [
  { to: "/", label: "Overview", end: true },
  { to: "/scan", label: "Scan" },
  { to: "/report", label: "Report" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/90 bg-canvas/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <NavLink
            to="/"
            className="group flex min-w-0 items-center gap-3 text-ink no-underline"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-elevated text-accent ring-1 ring-border transition duration-300 group-hover:ring-accent/35 group-hover:shadow-[0_0_0_1px_oklch(0.74_0.14_58/0.25)]">
              <LogoMark className="h-[1.35rem] w-[1.35rem] text-accent" />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-[1.4rem] font-semibold leading-none tracking-tight text-ink">
                QuantumSafe
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
                Post-quantum readiness
              </span>
            </span>
          </NavLink>
          <nav
            className="flex items-center gap-0.5 rounded-2xl bg-surface/80 p-1 ring-1 ring-border/80"
            aria-label="Primary"
          >
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200",
                    isActive
                      ? "bg-elevated text-ink shadow-soft ring-1 ring-accent/40"
                      : "text-muted hover:bg-canvas/60 hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-14">
        {children}
      </main>
      <footer className="border-t border-border/80 bg-surface/40 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="max-w-[65ch] text-left text-xs leading-relaxed text-faint">
            QuantumSafe provides technical discovery and migration guidance only. Validate
            all cryptographic changes with your security and compliance teams. Not legal
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
