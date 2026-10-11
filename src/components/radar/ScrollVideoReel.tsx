"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { reelMobile, reelScene } from "@/lib/animations/presets";
import { TrendingVideo } from "./TrendingVideo";
import type { Video, VideoSignals } from "@/lib/types";

/**
 * Editorial reel of live videos. On desktop the section pins and scroll
 * position chooses the active video (scrub + snap to each stage). On mobile
 * and with reduced motion the same videos render as a plain vertical list.
 */
export function ScrollVideoReel({ videos, signals }: { videos: Video[]; signals: Record<string, VideoSignals> }) {
  const desktop = useRef<HTMLDivElement>(null);
  const mobile = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MEDIA.desktop, () => {
      if (!desktop.current) return;
      reelScene(desktop.current, (i) => {
        if (counter.current) counter.current.textContent = String(i + 1).padStart(2, "0");
      });
    });
    mm.add(MEDIA.mobile, () => {
      if (mobile.current) reelMobile(mobile.current);
    });
    return () => mm.revert();
  });

  if (!videos.length) return null;
  return (
    <section aria-labelledby="reel-title" className="relative border-b border-line">
      <h2 id="reel-title" className="sr-only">
        Live signals: the fastest-moving videos in this scan
      </h2>

      {/* Desktop: pinned, scroll-controlled stage */}
      <div ref={desktop} className="relative hidden h-[calc(100svh-3.5rem)] overflow-hidden min-[900px]:block motion-reduce:!hidden">
        <div className="absolute inset-x-8 top-0 z-10 flex items-center justify-between border-b border-line bg-bg py-3">
          <span className="micro text-fg-2">What is happening on YouTube right now</span>
          <span className="micro tabular text-fg-3">
            Signal <span ref={counter} className="text-fg">01</span> / {String(videos.length).padStart(2, "0")} · ranked by views per hour
          </span>
        </div>
        <div className="absolute inset-0 top-12">
          {videos.map((v, i) => (
            <TrendingVideo key={v.id} video={v} signals={signals[v.id]} index={i} total={videos.length} priority={i === 0} />
          ))}
        </div>
        <div className="absolute inset-x-8 bottom-6 h-px bg-line" aria-hidden>
          <div data-reel-progress className="h-px origin-left bg-signal" />
        </div>
      </div>

      {/* Mobile + reduced motion: stacked list */}
      <div ref={mobile} className="mx-auto max-w-3xl px-4 py-16 min-[900px]:hidden motion-reduce:!block md:px-8">
        <span className="micro text-fg-2">What is happening on YouTube right now · ranked by views per hour</span>
        {videos.map((v, i) => (
          <TrendingVideo key={v.id} video={v} signals={signals[v.id]} index={i} total={videos.length} variant="card" />
        ))}
      </div>
    </section>
  );
}
