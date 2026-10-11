"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { revealOnScroll, steppedScene } from "@/lib/animations/presets";
import { ago, compact, pct } from "@/lib/format";
import { Provenance } from "@/components/shared/Provenance";
import type { TrendCluster, Video } from "@/lib/types";

export function WhyNowSection({ cluster, videos }: { cluster: TrendCluster; videos: Video[] }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.desktop, () => {
        if (ref.current) steppedScene(ref.current, "[data-step]", "+=150%");
      });
      mm.add(MEDIA.mobile, () => {
        if (ref.current) revealOnScroll(ref.current.querySelectorAll("[data-step]"));
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  const m = cluster.metrics;
  const top = [...videos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const evidence: { label: string; value: string; sub: string; kind: "observed" | "calculated" }[] = [
    { label: "Creators", value: String(m.creatorCount), sub: "distinct channels in the cluster", kind: "calculated" },
    { label: "Videos", value: String(m.videoCount), sub: `in the last ${cluster.momentumSeries.length} days`, kind: "calculated" },
    { label: "Recent uploads", value: String(m.recentUploads), sub: "published in the last 72 hours", kind: "calculated" },
    { label: "Engagement", value: pct(m.avgEngagementRate, 1), sub: "mean (likes + comments) / views", kind: "calculated" },
    { label: "Momentum", value: cluster.momentum === "BUILDING BASELINE" ? "Baseline" : cluster.momentum, sub: cluster.momentumBasis === "coverage+snapshots" ? "uploads + stored snapshots" : "from upload timing", kind: "calculated" },
    { label: "Newest upload", value: ago(m.newestUploadAt), sub: top ? `top video: ${compact(top.views)} views` : "", kind: "observed" },
  ];
  return (
    <section ref={ref} className="relative flex items-center border-b border-line min-[900px]:h-[calc(100svh-3.5rem)]" aria-labelledby="whynow-title">
      <div className="mx-auto grid w-full max-w-[1600px] gap-12 px-4 py-20 md:px-8 min-[900px]:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col gap-8">
          <h2 id="whynow-title" data-step className="display-xl text-[clamp(56px,8vw,148px)]">
            WHY <span className="text-signal">NOW?</span>
          </h2>
          <div data-step className="flex flex-col gap-4">
            <Provenance kind="ai" className="self-start" />
            <p className="font-serif text-[clamp(24px,2.6vw,42px)] leading-[1.15] text-fg">{cluster.ai.whyNow}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 content-end gap-px self-end border border-line bg-line">
          {evidence.map((e) => (
            <div key={e.label} data-step className="flex flex-col gap-1.5 bg-bg p-5">
              <div className="flex items-center justify-between gap-2">
                <dt className="micro text-fg-3">{e.label}</dt>
                <Provenance kind={e.kind} />
              </div>
              <dd className="tabular text-3xl font-bold">{e.value}</dd>
              <dd className="text-xs text-fg-3">{e.sub}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
