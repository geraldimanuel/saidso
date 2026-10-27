/** Generated stand-ins for the template's photography: neon gradients, no stock images. */

const PALETTES = [
  ["#0f5132", "#19d3a2", "#0b1d3a"],
  ["#3b0a6b", "#ff4fd8", "#1a1a7a"],
  ["#06215c", "#2f7bff", "#00c2ff"],
  ["#2a0845", "#6441a5", "#ff6b5a"],
  ["#0b3d2e", "#c8ff5a", "#0a0a0a"],
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function Glow({ seed, className = "", style, ref, children }: { seed: string; className?: string; style?: React.CSSProperties; ref?: React.Ref<HTMLDivElement>; children?: React.ReactNode }) {
  const [a, b, c] = PALETTES[hash(seed) % PALETTES.length];
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        background: `radial-gradient(80% 90% at 20% 15%, ${b} 0%, transparent 55%), radial-gradient(70% 80% at 85% 90%, ${c} 0%, transparent 60%), ${a}`,
      }}
    >
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)" }}
        aria-hidden
      />
      {children}
    </div>
  );
}

/** Square avatar derived from an address. */
export function Avatar({ seed, className = "" }: { seed: string; className?: string }) {
  const h = hash(seed);
  const cells = Array.from({ length: 25 }, (_, i) => (h >> i) & 1);
  return (
    <Glow seed={seed} className={className}>
      <svg viewBox="0 0 5 5" className="absolute inset-[22%] opacity-90" shapeRendering="crispEdges" aria-hidden>
        {cells.map((on, i) => {
          const x = i % 5;
          const y = Math.floor(i / 5);
          // mirror left half so it reads like a face/sprite
          return on && x <= 2 ? (
            <g key={i}>
              <rect x={x} y={y} width="1" height="1" fill="white" />
              <rect x={4 - x} y={y} width="1" height="1" fill="white" />
            </g>
          ) : null;
        })}
      </svg>
    </Glow>
  );
}

/** Decorative odds chart for the stats panel. */
export function OddsChart() {
  const pts = Array.from({ length: 48 }, (_, i) => {
    const y = 55 + Math.sin(i / 3.1) * 14 + Math.sin(i / 1.3) * 5 - i * 0.6;
    return `${(i / 47) * 100},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="plot absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c8ff5a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#c8ff5a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="white" strokeOpacity="0.08" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={`0,100 ${pts} 100,100`} fill="url(#fill)" />
      <polyline points={pts} fill="none" stroke="#c8ff5a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
