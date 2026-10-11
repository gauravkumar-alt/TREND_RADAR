"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { revealOnScroll, steppedScene } from "@/lib/animations/presets";
import { formatDurationWords } from "@/lib/youtube/duration";
import { Provenance } from "@/components/shared/Provenance";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrendCluster } from "@/lib/types";

export function RecommendationSection({ cluster, creatorName }: { cluster: TrendCluster; creatorName: string }) {
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
  const r = cluster.ai.recommendation;
  const lead = cluster.formats[0];
  return (
    <section ref={ref} className="relative flex items-center border-b border-line min-[900px]:min-h-[calc(100svh-3.5rem)]" aria-labelledby="make-title">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-4 py-20 md:px-8">
        <h2 id="make-title" data-step className="display-xl text-[clamp(40px,6.5vw,120px)]">
          SO WHAT SHOULD <span className="text-signal">{creatorName.toUpperCase()}</span> MAKE?
        </h2>
        <div data-step className="flex flex-col gap-5 border-t border-signal pt-6">
          <div className="flex items-center gap-3">
            <span className="micro text-signal">What I would make</span>
            <Provenance kind="recommendation" />
          </div>
          <p className="font-serif text-[clamp(32px,4.4vw,76px)] leading-[1.02]">&ldquo;{r.possibleTitle}&rdquo;</p>
          <p className="max-w-3xl text-lg text-fg-2">{r.angle}</p>
        </div>
        <dl data-step className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-bg p-5">
            <dt className="micro flex items-center gap-2 text-fg-3">Format <Provenance kind="recommendation" /></dt>
            <dd className="text-2xl font-bold">{r.format}</dd>
            {lead && (
              <dd className="text-xs text-fg-3">
                Most common here: {lead.format} ({Math.round(lead.share * 100)}%)
              </dd>
            )}
          </div>
          <div className="flex flex-col gap-2 bg-bg p-5">
            <dt className="micro flex items-center gap-2 text-fg-3">Suggested length <Provenance kind="calculated" /></dt>
            <dd className="tabular text-2xl font-bold">{cluster.suggestedLengthSeconds ? `~${Math.round(cluster.suggestedLengthSeconds / 60)} min` : "—"}</dd>
            <dd className="text-xs text-fg-3">Like the best-performing videos here (average {formatDurationWords(cluster.metrics.avgDurationSeconds)})</dd>
          </div>
          <div className="flex flex-col gap-2 bg-bg p-5">
            <dt className="micro flex items-center gap-2 text-fg-3">Confidence <Provenance kind="calculated" /></dt>
            <dd className={cn("text-2xl font-bold", cluster.confidence === "HIGH" ? "text-signal" : cluster.confidence === "LOW" ? "text-cool" : "text-fg")}>{cluster.confidence}</dd>
            <dd className="text-xs text-fg-3">{cluster.confidenceReason}</dd>
          </div>
          <div className="flex flex-col gap-2 bg-bg p-5">
            <dt className="micro flex items-center gap-2 text-fg-3">Why now <Provenance kind="ai" /></dt>
            <dd className="text-sm leading-relaxed text-fg-2">{r.reason}</dd>
          </div>
        </dl>
        <div data-step>
          <Link href="/trends" className={cn(buttonVariants({ size: "lg" }))}>
            See full trend intelligence <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
