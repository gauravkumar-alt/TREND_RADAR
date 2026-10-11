"use client";
import { useEffect, useRef, useState } from "react";
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
import type { Provenance as P, RadarRun, TrendCluster as Cluster } from "@/lib/types";

function Block({ title, kind, children, className }: { title: string; kind?: P; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <h4 className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <span className="micro text-fg">{title}</span>
        {kind && <Provenance kind={kind} />}
      </h4>
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
  const first = useRef(true);

  useGSAP(
    () => {
      if (!panel.current) return;
      if (first.current) {
        first.current = false;
        return; // initial state comes from markup; no animation on load
      }
      if (prefersReducedMotion() || !open) return;
      gsap.fromTo(panel.current, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "height" });
      gsap.from(panel.current.querySelectorAll("[data-detail]"), { y: 20, opacity: 0, duration: 0.5, stagger: 0.05, ease: "power3.out", delay: 0.1 });
    },
    { dependencies: [open] },
  );

  const videos = cluster.videoIds.map((id) => run.videos[id]).filter(Boolean);
  const panelId = `${cluster.id}-detail`;
  const r = cluster.ai.recommendation;

  return (
    <article id={cluster.id} className="scroll-mt-40 border-t border-line-2 py-10 md:py-14" aria-labelledby={`${cluster.id}-title`}>
      <div className="grid gap-6 md:grid-cols-[110px_1fr] md:gap-10">
        <div className="flex items-baseline gap-4 md:flex-col md:gap-3">
          <span className="display-xl tabular text-5xl text-fg-3 md:text-7xl">{String(cluster.rank).padStart(2, "0")}</span>
          <span className="flex items-baseline gap-1" title="Trend score out of 100">
            <span className="tabular text-3xl font-bold text-signal md:text-4xl">{cluster.score}</span>
            <span className="micro text-fg-3">/100</span>
          </span>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <MomentumBadge momentum={cluster.momentum} />
            <span className="micro border border-line-2 px-2 py-1 text-fg-2" title={cluster.confidenceReason}>
              {cluster.confidence.charAt(0) + cluster.confidence.slice(1).toLowerCase()} confidence
            </span>
          </div>
          <h3 id={`${cluster.id}-title`} className="display-xl text-[clamp(32px,4.6vw,76px)]">
            {cluster.ai.name}
          </h3>
          <p className="max-w-4xl font-serif text-xl leading-snug text-fg-2 md:text-2xl">{cluster.ai.summary}</p>
          <TrendMetrics cluster={cluster} />

          {/* The answer, visible without expanding */}
          <div className="flex flex-col gap-1 border-l-2 border-signal pl-4">
            <span className="micro text-signal">What to make</span>
            <p className="font-serif text-xl leading-snug md:text-2xl">&ldquo;{r.possibleTitle}&rdquo;</p>
            <p className="text-sm text-fg-3">
              {r.format}
              {cluster.suggestedLengthSeconds ? ` · about ${Math.round(cluster.suggestedLengthSeconds / 60)} min` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="micro flex h-11 items-center gap-2 self-start border border-line-2 px-4 text-fg transition-colors hover:border-fg"
          >
            {open ? "Hide details" : "Show details"}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      <div ref={panel} id={panelId} hidden={!open} className="overflow-hidden">
        <div className="mt-10 grid gap-12 md:pl-[150px]">
          <div data-detail className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <Block title="Why now" kind="ai">
              <p className="font-serif text-2xl leading-snug md:text-3xl">{cluster.ai.whyNow}</p>
            </Block>
            <Block title="What viewers care about" kind="ai">
              <ul className="flex flex-col gap-3">
                {cluster.ai.audienceSignals.map((s) => (
                  <li key={s} className="flex gap-3 text-fg-2">
                    <span className="mt-2 size-1.5 shrink-0 bg-signal" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </Block>
          </div>

          <div data-detail>
            <TrendRecommendation cluster={cluster} />
          </div>

          <div data-detail>
            <Block title="Example videos" kind="observed">
              <EvidenceVideos videos={videos} formats={cluster.videoFormats} />
            </Block>
          </div>

          <div data-detail className="grid gap-10 lg:grid-cols-2">
            <Block title="Who's covering it" kind="observed">
              <CreatorCoverage creators={cluster.creators} />
            </Block>
            <Block title="Formats that work" kind="calculated">
              <FormatBreakdown formats={cluster.formats} />
            </Block>
          </div>

          <div data-detail className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <Block title="Is it growing?" kind="calculated">
              <div className="flex items-center gap-2">
                <MomentumBadge momentum={cluster.momentum} />
              </div>
              <p className="text-sm text-fg-2">{momentumExplainer(cluster)}</p>
              <MomentumChart series={cluster.momentumSeries} height={180} />
              {cluster.viewHistory.length >= 2 && <ViewHistoryChart points={cluster.viewHistory} />}
            </Block>
            <Block title="How the score is built" kind="calculated">
              <ScoreAnatomy score={cluster.score} breakdown={cluster.scoreBreakdown} />
            </Block>
          </div>
        </div>
      </div>
    </article>
  );
}
