/* ---------- Brand motifs: bronze key, lock, locked box ---------- */

export function KeyMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="key-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bronze-dark)" />
          <stop offset="50%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--bronze)" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#key-m)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="20" cy="20" r="11" />
        <circle cx="20" cy="20" r="4" fill="url(#key-m)" />
        <path d="M28 28 L52 52" />
        <path d="M44 44 L50 38 M48 48 L54 42" />
      </g>
    </svg>
  );
}

export function LockMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lock-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bronze-dark)" />
          <stop offset="50%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--bronze)" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#lock-m)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 28 V20 a14 14 0 0 1 28 0 V28" />
        <rect x="13" y="28" width="38" height="28" rx="3" fill="url(#lock-m)" />
      </g>
      <circle cx="32" cy="40" r="3.5" fill="var(--noir)" />
      <rect x="30.5" y="42" width="3" height="8" rx="1.5" fill="var(--noir)" />
    </svg>
  );
}

export function BoxMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="box-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bronze-dark)" />
          <stop offset="50%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--bronze)" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#box-m)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="10" y="22" width="44" height="32" rx="2" />
        <path d="M10 32 H54" />
        <rect x="27" y="14" width="10" height="12" rx="2" fill="var(--noir)" />
        <circle cx="32" cy="42" r="4" />
      </g>
    </svg>
  );
}
