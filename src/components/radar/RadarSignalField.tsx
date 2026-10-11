"use client";
import { useMemo, useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { radarAmbient } from "@/lib/animations/presets";
import { bestVelocity } from "@/lib/trends/signals";
import type { RadarRun } from "@/lib/types";

/**
 * Radar plot of the latest scan. Each dot is a real video:
 *   angle  = its cluster's sector (unclustered reel videos sit between sectors)
 *   radius = age (newest near the centre — closest to "about to trend")
 *   size   = log views/hour
 * With no scan, only the empty scope is drawn: no placeholder dots.
 */
export function RadarSignalField({ run, className }: { run: RadarRun | null; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const { dots, labels } = useMemo(() => layout(run), [run]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        if (ref.current) radarAmbient(ref.current);
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [dots.length] },
  );

  return (
    <svg ref={ref} viewBox="-260 -260 520 520" className={className} role="img" aria-label={run ? `Radar plot of ${dots.length} live videos across ${labels.length} topic clusters` : "Empty radar: no scan yet"}>
      <defs>
        <radialGradient id="sweepFade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(240)">
          <stop offset="0" stopColor="var(--signal)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[60, 120, 180, 240].map((r) => (
        <circle key={r} r={r} fill="none" stroke="var(--line-2)" strokeWidth="1" strokeDasharray={r === 240 ? "0" : "2 6"} />
      ))}
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1={-240} y1={0} x2={240} y2={0} stroke="var(--line)" transform={`rotate(${a})`} />
      ))}
      <g data-radar-sweep>
        <path d="M0 0 L0 -240 A240 240 0 0 1 169.7 -169.7 Z" fill="url(#sweepFade)" />
        <line x1="0" y1="0" x2="0" y2="-240" stroke="var(--signal)" strokeOpacity="0.7" />
      </g>
      {dots.map((d) => (
        <circle key={d.id} data-signal-dot cx={d.x} cy={d.y} r={d.r} fill={d.clustered ? "var(--signal)" : "var(--fg-2)"} fillOpacity={d.clustered ? 0.95 : 0.55}>
          <title>{d.title}</title>
        </circle>
      ))}
      {labels.map((l) => (
        <text
          key={l.text}
          data-signal-label
          x={l.x}
          y={l.y}
          textAnchor={l.x > 10 ? "start" : l.x < -10 ? "end" : "middle"}
          className="fill-fg-2"
          style={{ font: "500 10px var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          {l.text.length > 26 ? l.text.slice(0, 25) + "…" : l.text}
        </text>
      ))}
      <circle r="3" fill="var(--signal)" />
    </svg>
  );
}

/** Fixed precision so server and client render identical attributes (no hydration mismatch). */
const round = (n: number) => Math.round(n * 100) / 100;

function layout(run: RadarRun | null) {
  if (!run) return { dots: [], labels: [] };
  const clusters = run.clusters;
  const sector = (2 * Math.PI) / Math.max(1, clusters.length);
  const maxAge = run.settings.lookbackDays * 24;
  const vels = Object.values(run.signals).map((s) => bestVelocity(s) ?? 0);
  const maxLog = Math.log10(1 + Math.max(1, ...vels));
  const dots: { id: string; x: number; y: number; r: number; clustered: boolean; title: string }[] = [];
  const seen = new Set<string>();
  const place = (id: string, angle: number, clustered: boolean) => {
    const s = run.signals[id];
    const v = run.videos[id];
    if (!s || !v || seen.has(id)) return;
    seen.add(id);
    const radius = 40 + Math.min(1, s.ageHours / maxAge) * 190;
    const size = 2 + (Math.log10(1 + (bestVelocity(s) ?? 0)) / maxLog) * 5;
    dots.push({ id, x: round(Math.cos(angle) * radius), y: round(Math.sin(angle) * radius), r: round(size), clustered, title: v.title });
  };
  clusters.forEach((c, ci) => {
    const start = ci * sector - Math.PI / 2;
    c.videoIds.forEach((id, vi) => {
      const t = (vi + 1) / (c.videoIds.length + 1);
      place(id, start + sector * (0.15 + 0.7 * t), true);
    });
  });
  run.reelVideoIds.forEach((id, i) => place(id, i * 1.7 + 0.4, false));
  const labels = clusters.map((c, ci) => {
    const a = ci * sector - Math.PI / 2 + sector / 2;
    return { text: c.ai.name, x: round(Math.cos(a) * 252), y: round(Math.sin(a) * 252 + 3) };
  });
  return { dots, labels };
}
