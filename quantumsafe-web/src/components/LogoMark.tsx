/** Concentric rings + solid core — reads as key material without literal clichés */

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.28"
      />
      <circle
        cx="16"
        cy="16"
        r="9.25"
        stroke="currentColor"
        strokeWidth="1.35"
        opacity="0.5"
      />
      <circle cx="16" cy="16" r="3.25" fill="currentColor" opacity="0.95" />
    </svg>
  );
}
