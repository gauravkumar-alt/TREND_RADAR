"use client";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { clusterKeyword } from "@/lib/trends/keyword";
import { cn } from "@/lib/utils";
import type { TrendCluster } from "@/lib/types";

/**
 * The week's 3–4 topics as keyword + trend score chips orbiting the radar.
 * The ring turns slowly; chips counter-rotate so text stays upright. Hover or
 * keyboard focus pauses the orbit so chips are easy to click. Each opens the
 * topic on /trends.
 */
export function TopicOrbit({ clusters, className }: { clusters: TrendCluster[]; className?: string }) {
  const ring = useRef<HTMLDivElement>(null);
  const shown = clusters.slice(0, 4);

  useGSAP(
    () => {
      if (!ring.current) return;
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        const el = ring.current!;
        const tl = gsap.timeline({ repeat: -1, defaults: { ease: "none", duration: 70 } });
        tl.to(el, { rotation: 360 }, 0).to(el.querySelectorAll("[data-orbit-chip]"), { rotation: -360 }, 0);
        gsap.from(el.querySelectorAll("[data-orbit-chip]"), { scale: 0.6, opacity: 0, duration: 0.8, stagger: 0.12, delay: 1.2, ease: "back.out(1.6)" });
        const pause = () => tl.pause();
        const play = () => tl.play();
        el.addEventListener("mouseenter", pause);
        el.addEventListener("mouseleave", play);
        el.addEventListener("focusin", pause);
        el.addEventListener("focusout", play);
        return () => {
          el.removeEventListener("mouseenter", pause);
          el.removeEventListener("mouseleave", play);
          el.removeEventListener("focusin", pause);
          el.removeEventListener("focusout", play);
        };
      });
      return () => mm.revert();
    },
    { scope: ring, dependencies: [shown.map((c) => c.id).join()] },
  );

  if (!shown.length) return null;
  return (
    <nav aria-label="This week's topics" className={cn("pointer-events-none absolute inset-0 [--orbit-r:33%] md:[--orbit-r:40%]", className)}>
      <div ref={ring} className="absolute inset-0">
        {shown.map((c, i) => {
          // Start positions spread evenly, beginning top-left so chip 1 is read first.
          const a = (i / shown.length) * Math.PI * 2 - Math.PI * 0.75;
          // Radius comes from --orbit-r so phones get a tighter ring than desktop.
          const cx = Math.cos(a).toFixed(3);
          const cy = Math.sin(a).toFixed(3);
          return (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `calc(50% + ${cx} * var(--orbit-r))`, top: `calc(50% + ${cy} * var(--orbit-r))` }}
            >
              <div data-orbit-chip>
                <Link
                  href={`/trends#${c.id}`}
                  aria-label={`${c.ai.name}: trend score ${c.score} out of 100, ${c.metrics.videoCount} videos from ${c.metrics.creatorCount} creators. Open in Trend Intelligence.`}
                  title={c.ai.name}
                  className="group pointer-events-auto flex items-center gap-2 whitespace-nowrap border border-line-2 bg-bg/90 py-1 pl-1 pr-2.5 md:gap-2.5 md:py-1.5 md:pl-1.5 md:pr-3 backdrop-blur-sm transition-colors hover:border-signal focus-visible:border-signal"
                >
                  <span className="tabular flex h-7 min-w-7 items-center justify-center bg-signal px-1 font-display text-sm font-bold text-signal-ink md:h-8 md:min-w-8 md:px-1.5 md:text-base">{c.score}</span>
                  <span className="flex flex-col">
                    <span className="max-w-[6.5rem] truncate text-xs font-semibold leading-tight text-fg group-hover:text-signal md:max-w-none md:text-sm">{clusterKeyword(c)}</span>
                    <span className="micro hidden text-[9.5px] leading-tight text-fg-3 md:block">
                      {c.metrics.videoCount} videos · {c.momentum === "BUILDING BASELINE" ? "new" : c.momentum.toLowerCase()}
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
