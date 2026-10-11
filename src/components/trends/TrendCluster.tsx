"use client";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { prefersReducedMotion } from "@/lib/animations/motion";
import { Provenance } from "@/components/shared/Provenance";
import { cn } from "@/lib/utils";
import { MomentumBadge, TrendMetrics, momentumExplainer } from "./TrendMetrics";
import { MomentumChart, ViewHistoryChart } from "./MomentumChart";
import { FormatBreakdown } from "./FormatBreakdown";
import { CreatorCoverage } from "./CreatorCoverage";
import { EvidenceVideos } from "./EvidenceVideos";
import { TrendRecommendation } from "./TrendRecommendation";
import { ScoreAnatomy } from "./ScoreAnatomy";
import type { RadarRun, TrendCluster as Cluster } from "@/lib/types";

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <h4 className="micro border-b border-line pb-2 text-fg">{title}</h4>
      {children}
    </section>
  );
}

export function TrendCluster({ cluster, run, defaultOpen = false }: { cluster: Cluster; run: RadarRun; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (!panel.current) return;
      if (first.current) {
        first.current = false;
        return; // initial state comes from markup; no animation on load
      }
      if (prefersReducedMotion()) return;
      if (open) {
        gsap.fromTo(panel.current, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.6, ease: "power3.out", clearProps: "height" });
        gsap.from(panel.current.querySelectorAll("[data-detail]"), { y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.1 });
      }
    },
    { dependencies: [open] },
  );

  const videos = cluster.videoIds.map((id) => run.videos[id]).filter(Boolean);
  const panelId = `${cluster.id}-detail`;

  return (
    <article id={cluster.id} className="scroll-mt-20 border-t border-line-2 py-10 md:py-14" aria-labelledby={`${cluster.id}-title`}>
      <div className="grid gap-6 md:grid-cols-[120px_1fr] md:gap-10">
        <div className="flex items-start gap-4 md:flex-col">
          <span className="display-xl tabular text-6xl text-fg-3 md:text-8xl">{String(cluster.rank).padStart(2, "0")}</span>
          <div className="flex flex-col gap-2">
            <span className="micro text-fg-3">Score</span>
            <span className="tabular text-4xl font-bold text-signal">{cluster.score}</span>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <MomentumBadge momentum={cluster.momentum} />
            <span className="micro border border-line-2 px-2 py-1 text-fg-2">Confidence · {cluster.confidence}</span>
            {cluster.categories.map((c) => (
              <span key={c} className="micro px-1 text-fg-3">
                {c}
              </span>
            ))}
          </div>
          <h3 id={`${cluster.id}-title`} className="display-xl text-[clamp(36px,5vw,84px)]">
            {cluster.ai.name}
          </h3>
          <div className="flex max-w-4xl flex-col gap-2">
            <Provenance kind="ai" className="self-start" />
            <p className="font-serif text-xl leading-snug text-fg-2 md:text-2xl">{cluster.ai.summary}</p>
          </div>
          <TrendMetrics cluster={cluster} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="micro flex h-11 items-center gap-2 self-start border border-line-2 px-4 text-fg hover:border-fg"
          >
            {open ? "Close intelligence" : "Open full intelligence"}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      <div ref={panel} id={panelId} hidden={!open} className="overflow-hidden">
        <div className="mt-10 grid gap-12 md:pl-[160px]">
          <div data-detail className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <Block title="Why now">
              <Provenance kind="ai" className="self-start" />
              <p className="font-serif text-2xl leading-snug md:text-3xl">{cluster.ai.whyNow}</p>
            </Block>
            <Block title="Audience signals">
              <Provenance kind="ai" className="self-start" />
              <ul className="flex flex-col gap-3">
                {cluster.ai.audienceSignals.map((s) => (
                  <li key={s} className="flex gap-3 text-fg-2">
                    <span className="mt-2 size-1.5 shrink-0 bg-signal" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
              {cluster.metrics.avgEngagementRate != null && (
                <p className="micro text-fg-3">
                  Mean engagement {(cluster.metrics.avgEngagementRate * 100).toFixed(1)}% <Provenance kind="calculated" className="ml-1" />
                </p>
              )}
            </Block>
          </div>
          <div data-detail className="grid gap-10 lg:grid-cols-2">
            <Block title="Creator coverage">
              <CreatorCoverage creators={cluster.creators} />
            </Block>
            <Block title="Format breakdown">
              <FormatBreakdown formats={cluster.formats} />
            </Block>
          </div>
          <div data-detail className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <Block title="Momentum">
              <div className="flex items-center gap-2">
                <MomentumBadge momentum={cluster.momentum} />
                <Provenance kind="calculated" />
              </div>
              <MomentumChart series={cluster.momentumSeries} height={200} />
              {cluster.viewHistory.length >= 2 && <ViewHistoryChart points={cluster.viewHistory} />}
              <p className="text-sm text-fg-2">{momentumExplainer(cluster)}</p>
              <p className="font-serif text-lg italic text-fg-2">
                <Provenance kind="ai" className="mr-2 align-middle" />
                {cluster.ai.momentumNarrative}
              </p>
            </Block>
            <Block title="Score anatomy">
              <ScoreAnatomy score={cluster.score} breakdown={cluster.scoreBreakdown} />
            </Block>
          </div>
          <div data-detail>
            <Block title="Evidence">
              <EvidenceVideos videos={videos} formats={cluster.videoFormats} />
            </Block>
          </div>
          <div data-detail>
            <TrendRecommendation cluster={cluster} />
          </div>
        </div>
      </div>
    </article>
  );
}
