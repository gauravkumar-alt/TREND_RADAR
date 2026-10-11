import { format } from "date-fns";
import type { MomentumPoint, ViewHistoryPoint } from "@/lib/types";

/** Smooth path through points (Catmull-Rom → cubic Bézier, clamped so it never dips below the baseline). */
function smooth(pts: [number, number][], floor: number) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(floor, p1[1] + (p2[1] - p0[1]) / 6);
    const c2y = Math.min(floor, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Daily uploads inside the cluster across the lookback window (OBSERVED
 * publish dates). The line is drawn by GSAP via [data-momentum-line].
 */
export function MomentumChart({ series, height = 260, label = "Uploads per day in this cluster" }: { series: MomentumPoint[]; height?: number; label?: string }) {
  const W = 800;
  const H = height;
  const pad = { l: 8, r: 8, t: 24, b: 28 };
  const max = Math.max(1, ...series.map((p) => p.uploads));
  const x = (i: number) => pad.l + (i / Math.max(1, series.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = series.map((p, i) => [x(i), y(p.uploads)] as [number, number]);
  const line = smooth(pts, H - pad.b);
  const area = line ? `${line} L${x(series.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z` : "";
  const total = series.reduce((a, p) => a + p.uploads, 0);
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${series.map((p) => `${p.date} ${p.uploads}`).join(", ")}`}>
        <defs>
          <linearGradient id="momArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeDasharray="2 6" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line-2)" />
        {area && <path data-momentum-area d={area} fill="url(#momArea)" />}
        {line && <path data-momentum-line d={line} fill="none" stroke="var(--signal)" strokeWidth="2.5" strokeLinecap="round" />}
        {pts.map(([px, py], i) => (
          <g key={series[i].date}>
            {series[i].uploads > 0 && <circle data-momentum-dot cx={px} cy={py} r="3.5" fill="var(--bg)" stroke="var(--signal)" strokeWidth="2" />}
            {(series.length <= 8 || i % Math.ceil(series.length / 7) === 0 || i === series.length - 1) && (
              <text x={px} y={H - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} style={{ font: "500 10px var(--font-mono)" }} className="fill-fg-3">
                {format(new Date(series[i].date + "T00:00:00"), "EEE d").toUpperCase()}
              </text>
            )}
          </g>
        ))}
        <text x={pad.l} y={14} style={{ font: "500 10px var(--font-mono)" }} className="fill-fg-3">
          PEAK {max}/DAY · {total} UPLOADS
        </text>
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Indexed views across tracked videos (1.00 = first snapshot). Only rendered when real history exists. */
export function ViewHistoryChart({ points }: { points: ViewHistoryPoint[] }) {
  if (points.length < 2) return null;
  const W = 800;
  const H = 140;
  const pad = { l: 8, r: 8, t: 20, b: 22 };
  const max = Math.max(...points.map((p) => p.index));
  const min = Math.min(1, ...points.map((p) => p.index));
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / Math.max(0.0001, max - min)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.index)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Indexed views: ${points.map((p) => p.index.toFixed(2)).join(", ")}`}>
      <line x1={pad.l} x2={W - pad.r} y1={y(1)} y2={y(1)} stroke="var(--line-2)" strokeDasharray="2 6" />
      <path d={d} fill="none" stroke="var(--fg)" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={p.capturedAt} cx={x(i)} cy={y(p.index)} r="3" fill="var(--fg)" />
      ))}
      <text x={pad.l} y={12} style={{ font: "500 10px var(--font-mono)" }} className="fill-fg-3">
        VIEWS ×{points.at(-1)!.index.toFixed(2)} SINCE FIRST SNAPSHOT · {points.at(-1)!.videos} VIDEOS
      </text>
    </svg>
  );
}
