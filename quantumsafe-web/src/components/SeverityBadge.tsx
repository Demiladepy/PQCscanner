import { clsx } from "clsx";

const map: Record<string, string> = {
  CRITICAL:
    "bg-sev-critical/20 text-sev-critical ring-1 ring-inset ring-sev-critical/35",
  HIGH: "bg-sev-high/18 text-sev-high ring-1 ring-inset ring-sev-high/35",
  MEDIUM:
    "bg-sev-medium/16 text-sev-medium ring-1 ring-inset ring-sev-medium/30",
  LOW: "bg-sev-low/18 text-sev-low ring-1 ring-inset ring-sev-low/28",
};

export function SeverityBadge({ value }: { value: string }) {
  const v = value.toUpperCase();
  const cls = map[v] ?? "bg-surface text-muted ring-1 ring-inset ring-border";
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        cls,
      )}
    >
      {v}
    </span>
  );
}
