"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/animations/gsap";
import { MEDIA, prefersReducedMotion } from "@/lib/animations/motion";
import { PLAY_ONCE, detailsOpen, growBars, topicScene } from "@/lib/animations/presets";
import { ScoreGauge } from "./ScoreGauge";
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
  // Arriving via /trends#cN (e.g. from the radar orbit) opens that topic and closes the default one.
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);
  const panel = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Entry scene: rank drift, title rise, ring draw, numbers count. An open-on-load panel animates when reached.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        if (!article.current) return;
        topicScene(article.current);
        if (panel.current && !panel.current.hidden) {
          ScrollTrigger.create({ trigger: panel.current, start: "top 85%", toggleActions: PLAY_ONCE, animation: growBars(panel.current, 1.1) });
        }
      });
      return () => mm.revert();
    },
    { scope: article },
  );

  // Opening the panel later: blocks stagger, bars grow, chart draws, thumbnails wipe in.
  useGSAP(
    () => {
      if (!panel.current) return;
      if (first.current) {
        first.current = false;
        return;
      }
      if (prefersReducedMotion() || !open) return;
      detailsOpen(panel.current);
    },
    { dependencies: [open] },
  );

  const videos = cluster.videoIds.map((id) => run.videos[id]).filter(Boolean);
  const panelId = `${cluster.id}-detail`;

  return (
    <article ref={article} id={cluster.id} className="scroll-mt-44 border-t border-line-2 py-10 md:py-14" aria-labelledby={`${cluster.id}-title`}>
      <div data-topic-head className="grid gap-6 md:grid-cols-[140px_1fr] md:gap-10">
        <div className="flex items-center gap-5 md:flex-col md:items-start">
          <span data-rank-drift className="block">
            <span className="block overflow-hidden">
              <span data-rank className="display-xl tabular block text-6xl text-fg-3 md:text-[128px]">
                {String(cluster.rank).padStart(2, "0")}
              </span>
            </span>
          </span>
          <ScoreGauge score={cluster.score} size={104} />
        </div>
        <div className="flex flex-col gap-6">
          <div data-topic-badge className="flex flex-wrap items-center gap-2">
            <MomentumBadge momentum={cluster.momentum} />
            <span className="micro border border-line-2 px-2 py-1 text-fg-2">Confidence · {cluster.confidence}</span>
            {cluster.categories.map((c) => (
              <span key={c} className="micro px-1 text-fg-3">
                {c}
              </span>
            ))}
          </div>
          <h3 data-topic-title id={`${cluster.id}-title`} className="display-xl text-[clamp(36px,5vw,84px)]">
            {cluster.ai.name}
          </h3>
          <div data-topic-summary className="flex max-w-4xl flex-col gap-2">
            <Provenance kind="ai" className="self-start" />
            <p className="font-serif text-xl leading-snug text-fg-2 md:text-2xl">{cluster.ai.summary}</p>
          </div>
          <TrendMetrics cluster={cluster} />
          <button
            type="button"
            data-topic-toggle
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
        <div className="mt-10 grid gap-12 md:pl-[180px]">
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
