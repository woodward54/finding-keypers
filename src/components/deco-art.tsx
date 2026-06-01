import { cn } from "@/lib/utils";

/* Deterministic tiny PRNG so each placeholder is stable across renders. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Round to 2 decimals. `Math.sin`/`Math.cos` are implementation-defined and
 * can differ by a ULP between the server's V8 (Node) and the browser's V8,
 * which would trigger a React hydration mismatch on every coordinate. Rounding
 * makes both sides serialize to an identical string.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;

const palettes = [
  ["#1a140c", "#7a5a2e", "#e9c66b"],
  ["#0e0e0e", "#8a6a32", "#f2d27a"],
  ["#171008", "#9c7838", "#ffe08a"],
  ["#120f0a", "#6e5226", "#d9b765"],
  ["#0d0b07", "#a07c3c", "#ffd97a"],
];

/**
 * A stylised Art Deco "portrait" used as placeholder imagery in the gallery.
 * Each is generated deterministically from a seed: a sunburst, a geometric
 * figure, and a stepped deco frame in bronze + gold over black.
 */
export function DecoPortrait({
  seed,
  className,
}: {
  seed: number;
  className?: string;
}) {
  const rng = seeded(seed + 7);
  const [bg, bronze, gold] = palettes[seed % palettes.length];
  const rays = 16 + Math.floor(rng() * 10) * 2;
  const headR = r2(20 + rng() * 8);
  const gid = `g${seed}`;

  return (
    <svg
      viewBox="0 0 200 260"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Art deco portrait placeholder"
    >
      <defs>
        <linearGradient id={`${gid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bronze} />
          <stop offset="50%" stopColor={gold} />
          <stop offset="100%" stopColor={bronze} />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor={gold} stopOpacity="0.35" />
          <stop offset="100%" stopColor={bg} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="200" height="260" fill={bg} />
      <rect width="200" height="260" fill={`url(#${gid}-glow)`} />

      {/* Sunburst rays */}
      <g transform="translate(100 96)">
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2;
          const len = 120 + (i % 2 === 0 ? 18 : 0);
          return (
            <line
              key={i}
              x1={0}
              y1={0}
              x2={r2(Math.cos(a) * len)}
              y2={r2(Math.sin(a) * len)}
              stroke={i % 2 === 0 ? gold : bronze}
              strokeWidth={i % 2 === 0 ? 1.4 : 0.7}
              opacity={0.5}
            />
          );
        })}
      </g>

      {/* Geometric figure: head + shoulders */}
      <g fill={`url(#${gid}-metal)`}>
        <circle cx="100" cy="92" r={headR} />
        <path
          d={`M${100 - headR - 26} 230
             C ${100 - headR - 18} 165, ${100 - 10} ${118 + headR}, 100 ${118 + headR}
             C ${100 + 10} ${118 + headR}, ${100 + headR + 18} 165, ${100 + headR + 26} 230 Z`}
        />
      </g>
      {/* Collar chevrons */}
      <g
        stroke={bg}
        strokeWidth="2.5"
        fill="none"
        opacity="0.8"
        transform="translate(100 196)"
      >
        <path d="M-22 0 L0 14 L22 0" />
        <path d="M-22 12 L0 26 L22 12" />
      </g>

      {/* Stepped deco frame */}
      <g
        fill="none"
        stroke={`url(#${gid}-metal)`}
        strokeWidth="3"
      >
        <rect x="8" y="8" width="184" height="244" />
        <path d="M8 28 H28 V8 M192 28 H172 V8 M8 232 H28 V252 M192 232 H172 V252" />
      </g>
    </svg>
  );
}

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
