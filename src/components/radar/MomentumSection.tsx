"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { momentumMobile, momentumScene } from "@/lib/animations/presets";
import { signedPct } from "@/lib/format";
import { MomentumChart, ViewHistoryChart } from "@/components/trends/MomentumChart";
import { Provenance } from "@/components/shared/Provenance";
import { MomentumBadge, momentumExplainer } from "@/components/trends/TrendMetrics";
import type { TrendCluster } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MomentumSection({ cluster }: { cluster: TrendCluster }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.desktop, () => {
        if (ref.current) momentumScene(ref.current);
      });
      mm.add(MEDIA.mobile, () => {
        if (ref.current) momentumMobile(ref.current);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  const m = cluster.metrics;
  const verdictColor = cluster.momentum === "RISING" ? "text-signal" : cluster.momentum === "COOLING" ? "text-cool" : cluster.momentum === "STABLE" ? "text-fg" : "text-fg-3";

  return (
    <section ref={ref} className="relative flex items-center border-b border-line min-[900px]:h-[calc(100svh-3.5rem)]" aria-labelledby="momentum-title">
      <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-4 py-20 md:px-8 min-[900px]:grid-cols-[1.4fr_1fr] min-[900px]:items-center">
        <div className="flex flex-col gap-8">
          <h2 id="momentum-title" data-momentum-title data-m-reveal className="display-xl overflow-hidden text-[clamp(40px,6vw,104px)]">
            <span className="inline-block">IS THIS TREND</span> <span className="inline-block">RISING?</span>
          </h2>
          <div data-m-reveal className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="micro text-fg-3">{cluster.ai.name} · uploads per day</span>
              <Provenance kind="observed" />
            </div>
            <MomentumChart series={cluster.momentumSeries} />
          </div>
          {cluster.viewHistory.length >= 2 && (
            <div data-m-reveal className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="micro text-fg-3">View growth across stored snapshots</span>
                <Provenance kind="calculated" />
              </div>
              <ViewHistoryChart points={cluster.viewHistory} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <p data-momentum-verdict data-m-reveal className={cn("display-xl origin-left text-[clamp(48px,6.5vw,120px)]", verdictColor)}>
            {cluster.momentum === "BUILDING BASELINE" ? (
              <>
                BUILDING
                <br />
                BASELINE
              </>
            ) : (
              cluster.momentum
            )}
          </p>
          <div data-momentum-note data-m-reveal className="flex flex-wrap items-center gap-2">
            <MomentumBadge momentum={cluster.momentum} />
            <Provenance kind="calculated" />
          </div>
          <dl data-momentum-note data-m-reveal className="grid grid-cols-2 gap-5 border-t border-line pt-5">
            <div>
              <dt className="micro text-fg-3">Coverage change</dt>
              <dd className="tabular text-2xl font-semibold">{m.coverageGrowth == null ? "—" : signedPct(m.coverageGrowth)}</dd>
              <dd className="text-xs text-fg-3">newer vs older half of the window</dd>
            </div>
            <div>
              <dt className="micro text-fg-3">Uploads, last 72h</dt>
              <dd className="tabular text-2xl font-semibold">{m.recentUploads}</dd>
              <dd className="text-xs text-fg-3">of {m.videoCount} in the cluster</dd>
            </div>
          </dl>
          <p data-momentum-note data-m-reveal className="text-sm text-fg-2">
            {momentumExplainer(cluster)}
          </p>
          <div data-momentum-note data-m-reveal className="flex flex-col gap-2 border-l border-line-2 pl-4">
            <Provenance kind="ai" className="self-start" />
            <p className="font-serif text-lg italic text-fg-2">{cluster.ai.momentumNarrative}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
