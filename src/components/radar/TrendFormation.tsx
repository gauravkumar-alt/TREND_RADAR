"use client";
import Image from "next/image";
import { useMemo, useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { countUp, formationScene, revealOnScroll } from "@/lib/animations/presets";
import { compact, signedPct } from "@/lib/format";
import { formatDurationWords } from "@/lib/youtube/duration";
import { Provenance } from "@/components/shared/Provenance";
import type { TrendCluster, Video } from "@/lib/types";

/**
 * Signature interaction: the cluster's real videos start scattered around the
 * stage and converge into the topic, which then reveals its calculated stats.
 */
export function TrendFormation({ cluster, videos }: { cluster: TrendCluster; videos: Video[] }) {
  const ref = useRef<HTMLElement>(null);
  const cards = videos.slice(0, 8);

  // Deterministic scatter on an ellipse — same layout on every render.
  const positions = useMemo(
    () =>
      cards.map((_, i) => {
        const a = (i / cards.length) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.18 : -0.12);
        return { x: Math.round(Math.cos(a) * 520), y: Math.round(Math.sin(a) * 270), r: ((i * 37) % 14) - 7 };
      }),
    [cards],
  );

  const m = cluster.metrics;
  const stats: { label: string; value: number | null; format: (n: number) => string; fallback: string; kind: "calculated" | "observed" }[] = [
    { label: "Creators", value: m.creatorCount, format: (n) => String(Math.round(n)), fallback: "—", kind: "calculated" },
    { label: "Videos", value: m.videoCount, format: (n) => String(Math.round(n)), fallback: "—", kind: "calculated" },
    { label: "Coverage change", value: m.coverageGrowth, format: (n) => signedPct(n), fallback: "Building baseline", kind: "calculated" },
    { label: "Avg duration", value: m.avgDurationSeconds, format: (n) => formatDurationWords(Math.round(n)), fallback: "—", kind: "calculated" },
    { label: "Trend score", value: cluster.score, format: (n) => String(Math.round(n)), fallback: "—", kind: "calculated" },
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.desktop, () => {
        if (!ref.current) return;
        let counted = false;
        formationScene(ref.current, () => {
          if (counted || !ref.current) return;
          counted = true;
          ref.current.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            const to = Number(el.dataset.count);
            const s = stats[Number(el.dataset.idx)];
            if (Number.isFinite(to)) countUp(el, to, s.format, 1.1);
          });
        });
      });
      mm.add(MEDIA.mobile, () => {
        if (ref.current) revealOnScroll(ref.current.querySelectorAll("[data-m-reveal]"));
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-line min-[900px]:h-[calc(100svh-3.5rem)]" aria-labelledby="formation-title">
      <div className="grid-lines grid-fade pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="micro absolute left-4 top-6 z-10 flex items-center gap-3 text-fg-2 md:left-8">
        <span className="text-signal">Cluster 01</span> Individual signals → one pattern
      </div>

      {/* Desktop stage */}
      <div className="relative hidden h-full items-center justify-center min-[900px]:flex motion-reduce:!hidden">
        <svg data-formation-lines width="0" height="0" className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible" aria-hidden>
          {positions.map((p, i) => (
            <line key={i} x1="0" y1="0" x2={p.x} y2={p.y} stroke="var(--line-2)" strokeDasharray="3 6" />
          ))}
        </svg>
        {cards.map((v, i) => (
          <div
            key={v.id}
            data-formation-card
            style={{ "--fx": `${positions[i].x}px`, "--fy": `${positions[i].y}px`, "--fr": `${positions[i].r}deg` } as React.CSSProperties}
            className="absolute left-1/2 top-1/2 -ml-[110px] -mt-[80px] w-[220px] border border-line-2 bg-bg-2 p-2 will-change-transform"
          >
            <div className="relative aspect-video overflow-hidden bg-bg-3">
              <Image src={v.thumbnailUrl} alt="" fill sizes="220px" className="object-cover" />
            </div>
            <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug">{v.title}</p>
            <p className="micro mt-1 truncate text-[9.5px] text-fg-3">
              {v.channelTitle} · {compact(v.views)} views
            </p>
          </div>
        ))}
        <div data-formation-topic className="relative z-10 flex max-w-5xl flex-col items-center gap-8 px-8 text-center">
          <Provenance kind="ai" />
          <h2 id="formation-title" className="display-xl text-[clamp(48px,7.5vw,128px)]">
            {cluster.ai.name}
          </h2>
          <dl className="grid grid-cols-5 gap-10 border-t border-line pt-6">
            {stats.map((s, i) => (
              <div key={s.label} data-formation-stat className="flex flex-col items-center gap-1.5">
                <dt className="micro text-fg-3">{s.label}</dt>
                <dd className="tabular text-3xl font-bold text-fg">
                  {s.value == null ? (
                    <span className="micro text-sm text-fg-3">{s.fallback}</span>
                  ) : (
                    <span data-count={s.value} data-idx={i}>
                      {s.format(s.value)}
                    </span>
                  )}
                </dd>
                <dd>
                  <Provenance kind={s.kind} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Mobile + reduced motion */}
      <div className="flex flex-col gap-8 px-4 pb-16 pt-20 min-[900px]:hidden motion-reduce:!flex md:px-8">
        <div data-m-reveal className="grid grid-cols-2 gap-2">
          {cards.slice(0, 4).map((v) => (
            <div key={v.id} className="relative aspect-video overflow-hidden bg-bg-3">
              <Image src={v.thumbnailUrl} alt="" fill sizes="50vw" className="object-cover opacity-70" />
            </div>
          ))}
        </div>
        <div data-m-reveal className="flex flex-col gap-3">
          <Provenance kind="ai" className="self-start" />
          <h2 className="display-xl text-5xl">{cluster.ai.name}</h2>
        </div>
        <dl data-m-reveal className="grid grid-cols-2 gap-6 border-t border-line pt-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <dt className="micro text-fg-3">{s.label}</dt>
              <dd className="tabular text-2xl font-bold">{s.value == null ? <span className="micro text-sm text-fg-3">{s.fallback}</span> : s.format(s.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
